-- Outbound discovery: prospects (kept apart from CRM companies until an admin approves them), website analyses,
-- per-workspace scoring settings, and an atomic admin-only "add to CRM" step.
-- Company-level data only: prospects hold no personal contact fields by design.
-- Retention: a prospect from a directory/API provider carries expires_at (provider policy); the purge deletes
-- it unless it was approved into the CRM, where only provider-permitted fields were copied.

alter table public.discovery_jobs
  add constraint discovery_jobs_id_workspace_key unique (id, workspace_id),
  add column duplicate_count integer not null default 0 check (duplicate_count >= 0),
  add column rejected_count  integer not null default 0 check (rejected_count >= 0);

-- ---------- Prospects ----------
create table public.prospects (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces (id) on delete cascade,
  discovery_job_id  uuid,
  name              text not null check (char_length(name) between 1 and 200),
  domain            text check (domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  website           text check (char_length(website) <= 300),
  industry          text check (char_length(industry) <= 120),
  category          text check (char_length(category) <= 120),
  city              text check (char_length(city) <= 120),
  region            text check (char_length(region) <= 120),
  country           text check (country ~ '^[A-Z]{2}$'),
  size_band         text check (size_band in ('1-10', '11-50', '51-200', '201-1000', '1000+')),
  source            text not null check (source in ('manual', 'csv_upload', 'api')),
  provider          text not null default 'manual' check (char_length(provider) between 1 and 60),
  provider_ref      text check (char_length(provider_ref) <= 300),
  intent_signals    text[] not null default '{}' check (cardinality(intent_signals) <= 10),
  research_status   text not null default 'new' check (research_status in ('new', 'analyzing', 'analyzed', 'failed', 'blocked')),
  review_status     text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  score             smallint check (score between 0 and 100),
  score_breakdown   jsonb,
  scored_at         timestamptz,
  notes             text check (char_length(notes) <= 2000),
  company_id        uuid,
  reviewed_by       uuid references auth.users (id) on delete set null,
  reviewed_at       timestamptz,
  expires_at        timestamptz,                -- provider retention limit; null = no limit (manual / CSV)
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (discovery_job_id, workspace_id) references public.discovery_jobs (id, workspace_id) on delete set null (discovery_job_id),
  foreign key (company_id, workspace_id) references public.companies (id, workspace_id) on delete set null (company_id)
);
-- Deduplication: one prospect per normalised domain, and per provider identifier.
create unique index prospects_ws_domain_uidx on public.prospects (workspace_id, domain) where domain is not null;
create unique index prospects_ws_provider_ref_uidx on public.prospects (workspace_id, provider, provider_ref) where provider_ref is not null;
create index prospects_ws_review_score_idx on public.prospects (workspace_id, review_status, score desc nulls last);
create index prospects_ws_industry_idx on public.prospects (workspace_id, lower(industry));
create index prospects_ws_location_idx on public.prospects (workspace_id, country, lower(city));
create index prospects_job_ws_idx on public.prospects (discovery_job_id, workspace_id);
create index prospects_company_ws_idx on public.prospects (company_id, workspace_id);
create index prospects_expires_idx on public.prospects (expires_at) where expires_at is not null;
create index prospects_reviewed_by_idx on public.prospects (reviewed_by);
create index prospects_created_by_idx on public.prospects (created_by);
create trigger prospects_touch before update on public.prospects for each row execute function private.touch_updated_at();

-- Review is an admin decision; the CRM link is only set by prospect_add_to_crm().
create or replace function private.guard_prospect_review()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  api boolean := coalesce(auth.role(), '') in ('anon', 'authenticated');
begin
  if tg_op = 'INSERT' then
    if new.review_status <> 'pending' or new.company_id is not null then
      raise exception 'New prospects start pending and outside the CRM';
    end if;
    new.reviewed_by := null; new.reviewed_at := null;
    return new;
  end if;
  if new.review_status is distinct from old.review_status then
    if api and not private.has_workspace_role(new.workspace_id, 'admin') then
      raise exception 'Only workspace admins can review prospects';
    end if;
    new.reviewed_by := (select auth.uid()); new.reviewed_at := now();
  end if;
  if new.company_id is distinct from old.company_id and api and coalesce(current_setting('app.crm_link', true), '') <> 'on' then
    raise exception 'Use prospect_add_to_crm() to link a prospect to the CRM';
  end if;
  return new;
end $$;
revoke execute on function private.guard_prospect_review() from public, anon, authenticated;
create trigger prospects_guard before insert or update on public.prospects
  for each row execute function private.guard_prospect_review();

-- ---------- Website analyses (written by the server only) ----------
create table public.website_analyses (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  prospect_id     uuid not null,
  url             text not null check (char_length(url) <= 300),
  final_url       text check (char_length(final_url) <= 300),
  status          text not null check (status in ('ok', 'blocked', 'robots_disallowed', 'not_html', 'error')),
  http_status     smallint,
  duration_ms     integer check (duration_ms >= 0),
  bytes           integer check (bytes >= 0),
  findings        jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  signals         jsonb not null default '{}'::jsonb,
  confirmed_count smallint not null default 0,
  inferred_count  smallint not null default 0,
  error           text check (char_length(error) <= 1000),
  created_at      timestamptz not null default now(),
  foreign key (prospect_id, workspace_id) references public.prospects (id, workspace_id) on delete cascade
);
create index website_analyses_prospect_ws_idx on public.website_analyses (prospect_id, workspace_id, created_at desc);
create index website_analyses_ws_idx on public.website_analyses (workspace_id);

-- ---------- Scoring settings (one row per workspace; defaults live in lib/discovery/scoring.ts) ----------
create table public.discovery_settings (
  workspace_id  uuid primary key references public.workspaces (id) on delete cascade,
  scoring       jsonb not null check (jsonb_typeof(scoring) = 'object'),
  updated_by    uuid references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now()
);
create index discovery_settings_updated_by_idx on public.discovery_settings (updated_by);

-- ---------- Grants + RLS ----------
revoke all on public.prospects, public.website_analyses, public.discovery_settings from anon, authenticated;
grant select, insert, update, delete on public.prospects to authenticated;
grant select on public.website_analyses to authenticated;
grant select, insert, update on public.discovery_settings to authenticated;

alter table public.prospects          enable row level security;
alter table public.website_analyses   enable row level security;
alter table public.discovery_settings enable row level security;

create policy "prospects: read" on public.prospects for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "prospects: insert" on public.prospects for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id, 'member')) and created_by = (select auth.uid()));
create policy "prospects: update" on public.prospects for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'member'))) with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "prospects: delete" on public.prospects for delete to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

create policy "analyses: read" on public.website_analyses for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));

create policy "discovery settings: read" on public.discovery_settings for select to authenticated using ((select private.has_workspace_role(workspace_id, 'member')));
create policy "discovery settings: insert" on public.discovery_settings for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id, 'admin')));
create policy "discovery settings: update" on public.discovery_settings for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'admin'))) with check ((select private.has_workspace_role(workspace_id, 'admin')));

-- ---------- Approve + add to CRM (admin only, atomic) ----------
-- p_company carries only the fields the provider's policy allows us to keep (decided in lib/discovery/providers.ts).
create or replace function public.prospect_add_to_crm(p_prospect uuid, p_company jsonb, p_qualification text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  p          public.prospects;
  v_company  uuid;
  v_lead     uuid;
  v_name     text;
  v_domain   text := nullif(p_company ->> 'domain', '');
begin
  select * into p from public.prospects where id = p_prospect for update;
  if not found then raise exception 'Prospect not found' using errcode = 'P0002'; end if;
  if not private.has_workspace_role(p.workspace_id, 'admin') then
    raise exception 'Only workspace admins can add prospects to the CRM' using errcode = '42501';
  end if;
  if p.review_status = 'rejected' then raise exception 'Rejected prospects cannot be added to the CRM'; end if;
  if p.company_id is not null then
    return jsonb_build_object('company_id', p.company_id, 'lead_id', null, 'already_added', true);
  end if;
  if p_qualification not in ('unqualified', 'mql') then raise exception 'Bad qualification %', p_qualification; end if;

  v_name := coalesce(nullif(trim(p_company ->> 'name'), ''), v_domain, 'Unnamed company');
  if v_domain is not null then
    insert into public.companies (workspace_id, name, domain, website, industry, country, size_band)
    values (p.workspace_id, v_name, v_domain, nullif(p_company ->> 'website', ''), nullif(p_company ->> 'industry', ''),
            nullif(p_company ->> 'country', ''), nullif(p_company ->> 'size_band', ''))
    on conflict (workspace_id, domain) where domain is not null do update set
      website  = coalesce(public.companies.website, excluded.website),
      industry = coalesce(public.companies.industry, excluded.industry)
    returning id into v_company;
  else
    insert into public.companies (workspace_id, name, website, industry, country, size_band)
    values (p.workspace_id, v_name, nullif(p_company ->> 'website', ''), nullif(p_company ->> 'industry', ''),
            nullif(p_company ->> 'country', ''), nullif(p_company ->> 'size_band', ''))
    returning id into v_company;
  end if;

  insert into public.leads (workspace_id, name, company, source, company_id, score, qualification, notes, last_activity_at)
  values (p.workspace_id, v_name, v_name, 'discovery', v_company, coalesce(p.score, 0), p_qualification,
          'Added from discovery (' || p.provider || ') after admin review.', now())
  returning id into v_lead;

  insert into public.lead_activities (workspace_id, lead_id, kind, body, meta, actor_id)
  values (p.workspace_id, v_lead, 'system', 'Approved from discovery and added to the CRM.',
          jsonb_build_object('prospect_id', p.id, 'provider', p.provider, 'score', p.score), (select auth.uid()));

  perform set_config('app.crm_link', 'on', true);
  update public.prospects set review_status = 'approved', company_id = v_company where id = p.id;
  perform set_config('app.crm_link', '', true);

  -- n8n contract: crm.updated v1 (lib/events/contracts.ts)
  insert into public.outbox_events (workspace_id, topic, aggregate_id, payload)
  values (p.workspace_id, 'crm.updated', v_lead, jsonb_build_object(
    'id', gen_random_uuid(), 'type', 'crm.updated', 'version', 1, 'occurred_at', to_jsonb(now()), 'workspace_id', p.workspace_id,
    'data', jsonb_build_object('action', 'prospect_added', 'prospect_id', p.id, 'company_id', v_company, 'lead_id', v_lead)));

  insert into public.audit_log (actor_id, action, entity, entity_id, meta, workspace_id)
  values ((select auth.uid()), 'add_to_crm', 'prospects', p.id::text, jsonb_build_object('company_id', v_company, 'lead_id', v_lead), p.workspace_id);

  return jsonb_build_object('company_id', v_company, 'lead_id', v_lead, 'already_added', false);
end $$;
revoke all on function public.prospect_add_to_crm(uuid, jsonb, text) from public, anon;
grant execute on function public.prospect_add_to_crm(uuid, jsonb, text) to authenticated;

-- ---------- Retention: expired provider data ----------
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
  -- Provider data past its permitted retention (approved prospects already copied only permitted fields to the CRM).
  delete from public.prospects where expires_at is not null and expires_at < now();
  get diagnostics n = row_count; result := result || jsonb_build_object('prospects', n);
  return result;
end $$;
revoke all on function public.crm_purge_expired() from public, anon, authenticated;
grant execute on function public.crm_purge_expired() to service_role;
