-- Automation: discovery jobs (no open-ended scraping), outreach drafts with mandatory human approval,
-- email events, automation runs, transactional outbox for n8n, and a retention purge.

-- ---------- Discovery jobs ----------
-- Only CSV uploads or official APIs, each with a recorded legal basis and a hard result cap.
create table public.discovery_jobs (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  source           text not null check (source in ('csv_upload', 'api')),
  source_name      text not null check (char_length(source_name) between 1 and 120),   -- e.g. 'Google Places API'
  legal_basis      text not null check (char_length(legal_basis) between 10 and 500),
  query            jsonb not null default '{}'::jsonb,
  max_results      integer not null default 100 check (max_results between 1 and 1000),
  status           text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  found_count      integer not null default 0 check (found_count >= 0),
  imported_count   integer not null default 0 check (imported_count >= 0),
  suppressed_count integer not null default 0 check (suppressed_count >= 0),
  error            text check (char_length(error) <= 2000),
  created_by       uuid references auth.users (id) on delete set null,
  started_at       timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index discovery_jobs_ws_idx on public.discovery_jobs (workspace_id, created_at desc);
create index discovery_jobs_created_by_idx on public.discovery_jobs (created_by);

-- ---------- Outreach drafts ----------
create table public.outreach_drafts (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces (id) on delete cascade,
  contact_id           uuid not null,
  lead_id              uuid,
  channel              text not null default 'email' check (channel in ('email')),
  subject              text not null check (char_length(subject) between 1 and 200),
  body                 text not null check (char_length(body) between 1 and 20000),
  status               text not null default 'draft'
                       check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'sent', 'failed')),
  created_by           uuid references auth.users (id) on delete set null,
  approved_by          uuid references auth.users (id) on delete set null,
  approved_at          timestamptz,
  rejected_reason      text check (char_length(rejected_reason) <= 500),
  sent_at              timestamptz,
  provider_message_id  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- A person must have approved anything approved or sent (service-role writes have no auth.uid()).
  check (status not in ('approved', 'sent') or (approved_by is not null and approved_at is not null)),
  check (status <> 'sent' or sent_at is not null),
  unique (id, workspace_id),
  foreign key (contact_id, workspace_id) references public.contacts (id, workspace_id) on delete cascade,
  foreign key (lead_id, workspace_id) references public.leads (id, workspace_id) on delete set null (lead_id)
);
create index outreach_drafts_ws_status_idx on public.outreach_drafts (workspace_id, status, updated_at desc);
create index outreach_drafts_contact_idx on public.outreach_drafts (contact_id);
create index outreach_drafts_lead_idx on public.outreach_drafts (lead_id);
create index outreach_drafts_created_by_idx on public.outreach_drafts (created_by);
create index outreach_drafts_approved_by_idx on public.outreach_drafts (approved_by);

-- No automatic outbound email: approval is a workspace-admin action, any content edit voids it,
-- only the sending service (not an API user) can mark 'sent', and only after approval.
create or replace function private.guard_outreach_transition()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  api boolean := coalesce(auth.role(), '') in ('anon', 'authenticated');
begin
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_approval') then
      raise exception 'New outreach starts as draft or pending_approval';
    end if;
    new.approved_by := null; new.approved_at := null; new.sent_at := null; new.provider_message_id := null;
    return new;
  end if;

  if old.status = 'sent' and api then
    raise exception 'Sent outreach is read-only';
  end if;

  -- Any edit to approved content needs a fresh approval.
  if old.status = 'approved' and (new.subject, new.body, new.contact_id) is distinct from (old.subject, old.body, old.contact_id) then
    new.status := 'pending_approval'; new.approved_by := null; new.approved_at := null;
  end if;

  if new.status = 'approved' and old.status <> 'approved' then
    if old.status not in ('draft', 'pending_approval') then
      raise exception 'Only drafts awaiting approval can be approved';
    end if;
    if not private.has_workspace_role(new.workspace_id, 'admin') then
      raise exception 'Only workspace admins can approve outreach';
    end if;
    new.approved_by := (select auth.uid()); new.approved_at := now();
  elsif new.status = 'approved' then
    new.approved_by := old.approved_by; new.approved_at := old.approved_at;   -- approval can't be reassigned
  end if;

  if new.status in ('sent', 'failed') and new.status is distinct from old.status then
    if api then raise exception 'Only the sending service can record a send'; end if;
    if old.status <> 'approved' then raise exception 'Outreach must be approved before it is sent'; end if;
    if new.status = 'sent' then new.sent_at := coalesce(new.sent_at, now()); end if;
    new.approved_by := old.approved_by; new.approved_at := old.approved_at;
  end if;

  return new;
end $$;
revoke execute on function private.guard_outreach_transition() from public, anon, authenticated;
create trigger outreach_drafts_guard before insert or update on public.outreach_drafts
  for each row execute function private.guard_outreach_transition();

-- ---------- Email events (provider webhooks) ----------
create table public.email_events (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces (id) on delete cascade,
  draft_id             uuid,
  contact_id           uuid,
  provider             text not null check (provider in ('gmail', 'resend')),
  provider_message_id  text not null check (char_length(provider_message_id) <= 300),
  event                text not null check (event in ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'replied', 'unsubscribed')),
  meta                 jsonb not null default '{}'::jsonb,
  occurred_at          timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  unique (provider, provider_message_id, event, occurred_at),
  foreign key (draft_id, workspace_id) references public.outreach_drafts (id, workspace_id) on delete set null (draft_id),
  foreign key (contact_id, workspace_id) references public.contacts (id, workspace_id) on delete set null (contact_id)
);
create index email_events_ws_idx on public.email_events (workspace_id, occurred_at desc);
create index email_events_draft_idx on public.email_events (draft_id);
create index email_events_contact_idx on public.email_events (contact_id);

-- ---------- Automation runs (n8n executions) ----------
create table public.automation_runs (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  workflow         text not null check (char_length(workflow) between 1 and 120),
  trigger          text not null check (trigger in ('outbox', 'schedule', 'manual', 'webhook')),
  external_run_id  text check (char_length(external_run_id) <= 200),
  status           text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  input            jsonb not null default '{}'::jsonb,
  output           jsonb not null default '{}'::jsonb,
  error            text check (char_length(error) <= 4000),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (workflow, external_run_id)
);
create index automation_runs_ws_idx on public.automation_runs (workspace_id, started_at desc);

-- ---------- Transactional outbox (n8n pulls / is pushed these with signed requests) ----------
create table public.outbox_events (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  topic            text not null check (topic ~ '^[a-z_]+\.[a-z_]+$'),          -- e.g. 'lead.created'
  aggregate_id     uuid,
  payload          jsonb not null default '{}'::jsonb,
  status           text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed', 'dead')),
  attempts         smallint not null default 0 check (attempts >= 0),
  next_attempt_at  timestamptz not null default now(),
  last_error       text check (char_length(last_error) <= 2000),
  created_at       timestamptz not null default now(),
  delivered_at     timestamptz
);
create index outbox_events_due_idx on public.outbox_events (next_attempt_at) where status in ('pending', 'failed');
create index outbox_events_ws_idx on public.outbox_events (workspace_id, created_at desc);

create trigger discovery_jobs_touch before update on public.discovery_jobs for each row execute function private.touch_updated_at();
create trigger outreach_drafts_touch before update on public.outreach_drafts for each row execute function private.touch_updated_at();

-- ---------- Grants + RLS ----------
revoke all on public.discovery_jobs, public.outreach_drafts, public.email_events,
  public.automation_runs, public.outbox_events from anon, authenticated;
grant select, insert, update, delete on public.discovery_jobs, public.outreach_drafts to authenticated;
grant select on public.email_events, public.automation_runs, public.outbox_events to authenticated;   -- written by the server / n8n only

alter table public.discovery_jobs  enable row level security;
alter table public.outreach_drafts enable row level security;
alter table public.email_events    enable row level security;
alter table public.automation_runs enable row level security;
alter table public.outbox_events   enable row level security;

create policy "discovery: read" on public.discovery_jobs for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "discovery: insert" on public.discovery_jobs for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id, 'member')) and created_by = (select auth.uid()));
create policy "discovery: update" on public.discovery_jobs for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'member'))) with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "discovery: delete" on public.discovery_jobs for delete to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

create policy "drafts: read" on public.outreach_drafts for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "drafts: insert" on public.outreach_drafts for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id, 'member')) and created_by = (select auth.uid()));
create policy "drafts: update" on public.outreach_drafts for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'member'))) with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "drafts: delete" on public.outreach_drafts for delete to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

create policy "email events: read" on public.email_events for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "automation runs: read" on public.automation_runs for select to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));
create policy "outbox: read" on public.outbox_events for select to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

-- ---------- Retention ----------
-- Run daily from n8n or a Vercel cron with the service role. Windows are the defaults; change them here.
create or replace function public.crm_purge_expired()
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
  n integer;
begin
  delete from private.rate_limits where window_start < now() - interval '1 day';
  get diagnostics n = row_count; result := result || jsonb_build_object('rate_limits', n);
  delete from public.outbox_events where status = 'delivered' and delivered_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('outbox_events', n);
  delete from public.automation_runs where finished_at < now() - interval '180 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('automation_runs', n);
  delete from public.email_events where occurred_at < now() - interval '2 years';
  get diagnostics n = row_count; result := result || jsonb_build_object('email_events', n);
  delete from public.audit_log where created_at < now() - interval '2 years';
  get diagnostics n = row_count; result := result || jsonb_build_object('audit_log', n);
  return result;
end $$;
revoke all on function public.crm_purge_expired() from public, anon, authenticated;
grant execute on function public.crm_purge_expired() to service_role;
