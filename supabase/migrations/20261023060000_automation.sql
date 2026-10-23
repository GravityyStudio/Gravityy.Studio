-- n8n automation: outbox delivery (claim / complete / dead-letter / requeue), outreach draft versioning,
-- eligibility (suppression, consent, cool-down), send requests with exact-version approval, the claim-and-record
-- send protocol used by the Gmail workflow, and follow-up candidates. No email is sent by the database:
-- these functions only gate and record what the n8n Gmail workflow does after an explicit admin action.

-- ---------- Outbox delivery ----------
-- Claims due events with a lease (status 'processing', next_attempt_at = lease expiry), skipping rows other
-- dispatchers hold. Expired leases are re-claimable, so a crashed dispatcher never strands an event.
create or replace function public.outbox_claim(p_limit integer, p_lease_seconds integer)
returns setof public.outbox_events
language sql security definer
set search_path = ''
as $$
  update public.outbox_events o
  set status = 'processing', attempts = o.attempts + 1, next_attempt_at = now() + make_interval(secs => p_lease_seconds)
  where o.id in (
    select id from public.outbox_events
    where status in ('pending', 'failed', 'processing') and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 100)
  )
  returning o.*;
$$;

-- Success → delivered. Failure → retry with exponential backoff (2^attempts minutes, max 6 h); after 8 attempts → dead letter.
create or replace function public.outbox_complete(p_id uuid, p_ok boolean, p_error text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  o public.outbox_events;
begin
  select * into o from public.outbox_events where id = p_id for update;
  if not found then raise exception 'Outbox event % not found', p_id; end if;
  if o.status = 'delivered' then return 'delivered'; end if;            -- idempotent
  if p_ok then
    update public.outbox_events set status = 'delivered', delivered_at = now(), last_error = null where id = p_id;
    return 'delivered';
  end if;
  if o.attempts >= 8 then
    update public.outbox_events set status = 'dead', last_error = left(p_error, 2000) where id = p_id;
    return 'dead';
  end if;
  update public.outbox_events
  set status = 'failed', last_error = left(p_error, 2000), next_attempt_at = now() + make_interval(mins => least(360, power(2, o.attempts)::int))
  where id = p_id;
  return 'failed';
end $$;

-- Recovery: an admin puts a dead (or failed) event back in the queue with a fresh attempt budget.
create or replace function public.outbox_requeue(p_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  o public.outbox_events;
begin
  select * into o from public.outbox_events where id = p_id for update;
  if not found then raise exception 'Outbox event % not found', p_id; end if;
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not private.has_workspace_role(o.workspace_id, 'admin') then
    raise exception 'Only workspace admins can requeue events' using errcode = '42501';
  end if;
  if o.status not in ('dead', 'failed') then raise exception 'Only failed or dead events can be requeued (this one is %)', o.status; end if;
  update public.outbox_events set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null where id = p_id;
  insert into public.audit_log (actor_id, action, entity, entity_id, meta, workspace_id)
  values ((select auth.uid()), 'requeue', 'outbox_events', p_id::text, jsonb_build_object('topic', o.topic, 'was', o.status), o.workspace_id);
  return 'pending';
end $$;

-- ---------- Outreach drafts: purpose, versions, follow-ups ----------
alter table public.outreach_drafts
  add column purpose          text not null default 'outreach' check (purpose in ('reply', 'outreach')),
  add column version          integer not null default 1 check (version >= 1),
  add column approved_version integer,
  add column followup_of      uuid,
  add constraint outreach_drafts_followup_fk foreign key (followup_of, workspace_id)
    references public.outreach_drafts (id, workspace_id) on delete set null (followup_of);
create unique index outreach_drafts_followup_uidx on public.outreach_drafts (followup_of) where followup_of is not null;

-- Same rules as before, plus: every content edit bumps `version`; approval pins `approved_version`.
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
    new.version := 1; new.approved_version := null;
    return new;
  end if;

  if old.status = 'sent' and api then
    raise exception 'Sent outreach is read-only';
  end if;

  new.version := old.version;
  new.approved_version := old.approved_version;
  if (new.subject, new.body, new.contact_id) is distinct from (old.subject, old.body, old.contact_id) then
    new.version := old.version + 1;
    if old.status = 'approved' then
      new.status := 'pending_approval'; new.approved_by := null; new.approved_at := null; new.approved_version := null;
    end if;
  end if;

  if new.status = 'approved' and old.status <> 'approved' then
    if old.status not in ('draft', 'pending_approval') then
      raise exception 'Only drafts awaiting approval can be approved';
    end if;
    if not private.has_workspace_role(new.workspace_id, 'admin') then
      raise exception 'Only workspace admins can approve outreach';
    end if;
    new.approved_by := (select auth.uid()); new.approved_at := now(); new.approved_version := new.version;
  elsif new.status = 'approved' then
    new.approved_by := old.approved_by; new.approved_at := old.approved_at;
  end if;

  if new.status in ('sent', 'failed') and new.status is distinct from old.status then
    if api then raise exception 'Only the sending service can record a send'; end if;
    if old.status <> 'approved' then raise exception 'Outreach must be approved before it is sent'; end if;
    if new.status = 'sent' then new.sent_at := coalesce(new.sent_at, now()); end if;
    new.approved_by := old.approved_by; new.approved_at := old.approved_at;
  end if;

  return new;
end $$;

-- ---------- Send requests ----------
create table public.outreach_sends (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces (id) on delete cascade,
  draft_id             uuid not null,
  draft_version        integer not null,
  status               text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  requested_by         uuid references auth.users (id) on delete set null,
  provider             text not null default 'gmail' check (provider in ('gmail')),
  provider_message_id  text check (char_length(provider_message_id) <= 300),
  error                text check (char_length(error) <= 2000),
  claimed_at           timestamptz,
  sent_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  foreign key (draft_id, workspace_id) references public.outreach_drafts (id, workspace_id) on delete cascade
);
-- One live send per approved version: a retried webhook or double click can never send the same version twice.
create unique index outreach_sends_draft_version_uidx on public.outreach_sends (draft_id, draft_version) where status in ('queued', 'sending', 'sent');
create index outreach_sends_draft_ws_idx on public.outreach_sends (draft_id, workspace_id);
create index outreach_sends_ws_status_idx on public.outreach_sends (workspace_id, status, updated_at desc);
create index outreach_sends_requested_by_idx on public.outreach_sends (requested_by);
create trigger outreach_sends_touch before update on public.outreach_sends for each row execute function private.touch_updated_at();

revoke all on public.outreach_sends from anon, authenticated;
grant select on public.outreach_sends to authenticated;
alter table public.outreach_sends enable row level security;
create policy "sends: read" on public.outreach_sends for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));

-- ---------- Eligibility: who may receive a message, and why not ----------
-- 'reply'    : answering an enquiry they sent (enquiry record in the last 90 days).
-- 'outreach' : their latest outreach/marketing consent is 'granted'.
-- Always    : has an email, not marked invalid, not suppressed (email or domain), not contacted in the last 7 days.
create or replace function public.contact_outreach_eligibility(p_contact uuid, p_purpose text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  c        public.contacts;
  reasons  text[] := '{}';
begin
  if p_purpose not in ('reply', 'outreach') then raise exception 'Unknown purpose %', p_purpose; end if;
  select * into c from public.contacts where id = p_contact;
  if not found then return jsonb_build_object('eligible', false, 'reasons', jsonb_build_array('Contact not found')); end if;
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not private.has_workspace_role(c.workspace_id, 'viewer') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if c.email is null then reasons := array_append(reasons, 'No email address'); end if;
  if c.email_status = 'invalid' then reasons := array_append(reasons, 'Email address failed verification'); end if;
  if c.email is not null and exists (
    select 1 from public.suppression_entries s where s.workspace_id = c.workspace_id
      and ((s.kind = 'email' and s.value_hash = public.suppression_hash(c.email))
        or (s.kind = 'domain' and s.value_hash = public.suppression_hash(split_part(c.email, '@', 2))))
  ) then reasons := array_append(reasons, 'On the suppression list'); end if;
  if p_purpose = 'reply' and not exists (
    select 1 from public.consent_records r where r.contact_id = c.id and r.purpose = 'enquiry' and r.status = 'granted' and r.recorded_at > now() - interval '90 days'
  ) then reasons := array_append(reasons, 'No enquiry from this contact in the last 90 days'); end if;
  if p_purpose = 'outreach' and coalesce((
    select r.status from public.consent_records r where r.contact_id = c.id and r.purpose in ('outreach', 'marketing') order by r.recorded_at desc limit 1
  ), 'none') <> 'granted' then reasons := array_append(reasons, 'No outreach consent on record'); end if;
  if exists (
    select 1 from public.outreach_sends s join public.outreach_drafts d on d.id = s.draft_id
    where d.contact_id = c.id and s.status in ('sending', 'sent') and s.updated_at > now() - interval '7 days'
  ) then reasons := array_append(reasons, 'Already contacted in the last 7 days'); end if;
  return jsonb_build_object('eligible', cardinality(reasons) = 0, 'reasons', to_jsonb(reasons), 'workspace_id', c.workspace_id);
end $$;

-- Admin "Send": approved, unchanged since approval, eligible now. Queues one send and an outbox event.
create or replace function public.outreach_request_send(p_draft uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  d       public.outreach_drafts;
  elig    jsonb;
  v_send  uuid;
begin
  select * into d from public.outreach_drafts where id = p_draft for update;
  if not found then raise exception 'Draft not found' using errcode = 'P0002'; end if;
  if not private.has_workspace_role(d.workspace_id, 'admin') then
    raise exception 'Only workspace admins can send outreach' using errcode = '42501';
  end if;
  if d.status <> 'approved' then raise exception 'Only approved drafts can be sent (this one is %)', d.status; end if;
  if d.approved_version is distinct from d.version then raise exception 'The draft changed after approval; approve it again'; end if;
  elig := public.contact_outreach_eligibility(d.contact_id, d.purpose);
  if not (elig ->> 'eligible')::boolean then raise exception 'Not eligible: %', elig -> 'reasons'; end if;
  begin
    insert into public.outreach_sends (workspace_id, draft_id, draft_version, requested_by)
    values (d.workspace_id, d.id, d.version, (select auth.uid())) returning id into v_send;
  exception when unique_violation then
    raise exception 'This version is already queued or sent';
  end;
  insert into public.outbox_events (workspace_id, topic, aggregate_id, payload)
  values (d.workspace_id, 'outreach.send_requested', v_send, jsonb_build_object(
    'id', gen_random_uuid(), 'type', 'outreach.send_requested', 'version', 1, 'occurred_at', to_jsonb(now()), 'workspace_id', d.workspace_id,
    'data', jsonb_build_object('send_id', v_send, 'draft_id', d.id, 'draft_version', d.version)));
  insert into public.audit_log (actor_id, action, entity, entity_id, meta, workspace_id)
  values ((select auth.uid()), 'request_send', 'outreach_drafts', d.id::text, jsonb_build_object('send_id', v_send, 'version', d.version), d.workspace_id);
  return jsonb_build_object('send_id', v_send);
end $$;

-- Gmail workflow step 1 (server only): re-validate everything at send time, then hand over the content once.
create or replace function public.outreach_claim_send(p_send uuid, p_daily_limit integer)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  s     public.outreach_sends;
  d     public.outreach_drafts;
  elig  jsonb;
  used  integer;
  to_email text;
begin
  select * into s from public.outreach_sends where id = p_send for update;
  if not found then raise exception 'Send % not found', p_send; end if;
  if s.status <> 'queued' then return jsonb_build_object('ok', false, 'reason', 'not_queued', 'status', s.status); end if;
  select * into d from public.outreach_drafts where id = s.draft_id for update;
  if d.status <> 'approved' or d.version <> s.draft_version or d.approved_version is distinct from s.draft_version then
    update public.outreach_sends set status = 'cancelled', error = 'Draft changed or was unapproved after the send was requested' where id = s.id;
    return jsonb_build_object('ok', false, 'reason', 'draft_changed');
  end if;
  elig := public.contact_outreach_eligibility(d.contact_id, d.purpose);
  if not (elig ->> 'eligible')::boolean then
    update public.outreach_sends set status = 'cancelled', error = left('Not eligible at send time: ' || (elig -> 'reasons')::text, 2000) where id = s.id;
    return jsonb_build_object('ok', false, 'reason', 'not_eligible', 'reasons', elig -> 'reasons');
  end if;
  select count(*) into used from public.outreach_sends
  where workspace_id = s.workspace_id and status in ('sending', 'sent') and coalesce(sent_at, claimed_at) > now() - interval '24 hours';
  if used >= p_daily_limit then
    update public.outreach_sends set status = 'cancelled', error = format('Daily sending limit (%s) reached; request the send again tomorrow', p_daily_limit) where id = s.id;
    return jsonb_build_object('ok', false, 'reason', 'daily_limit', 'limit', p_daily_limit);
  end if;
  select email into to_email from public.contacts where id = d.contact_id;
  update public.outreach_sends set status = 'sending', claimed_at = now() where id = s.id;
  return jsonb_build_object('ok', true, 'send_id', s.id, 'draft_id', d.id, 'draft_version', d.version, 'to', to_email, 'subject', d.subject, 'body', d.body);
end $$;

-- Gmail workflow step 2 (server only): record the provider result. Idempotent for the same outcome.
create or replace function public.outreach_record_send(p_send uuid, p_status text, p_message_id text, p_error text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  s  public.outreach_sends;
  d  public.outreach_drafts;
begin
  if p_status not in ('sent', 'failed') then raise exception 'Bad status %', p_status; end if;
  select * into s from public.outreach_sends where id = p_send for update;
  if not found then raise exception 'Send % not found', p_send; end if;
  if s.status = p_status then return jsonb_build_object('ok', true, 'status', s.status, 'repeat', true); end if;
  if s.status <> 'sending' then raise exception 'Send % is %, not sending', p_send, s.status; end if;
  select * into d from public.outreach_drafts where id = s.draft_id for update;
  if p_status = 'sent' then
    if coalesce(p_message_id, '') = '' then raise exception 'A sent result needs the provider message id'; end if;
    update public.outreach_sends set status = 'sent', provider_message_id = p_message_id, sent_at = now(), error = null where id = s.id;
    update public.outreach_drafts set status = 'sent', provider_message_id = p_message_id, sent_at = now() where id = d.id;
    insert into public.email_events (workspace_id, draft_id, contact_id, provider, provider_message_id, event)
    values (s.workspace_id, d.id, d.contact_id, 'gmail', p_message_id, 'sent');
    if d.lead_id is not null then
      insert into public.lead_activities (workspace_id, lead_id, kind, body, meta)
      values (s.workspace_id, d.lead_id, 'email', 'Approved outreach email sent: ' || d.subject, jsonb_build_object('draft_id', d.id, 'send_id', s.id));
      update public.leads set last_activity_at = now() where id = d.lead_id;
    end if;
  else
    update public.outreach_sends set status = 'failed', error = left(coalesce(p_error, 'Send failed'), 2000) where id = s.id;
  end if;
  insert into public.audit_log (action, entity, entity_id, meta, workspace_id)
  values ('send_' || p_status, 'outreach_sends', s.id::text, jsonb_build_object('draft_id', d.id, 'message_id', p_message_id, 'error', left(p_error, 300)), s.workspace_id);
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;

-- ---------- Follow-up candidates ----------
-- Sent at least p_days ago, no reply/unsubscribe/bounce recorded, no follow-up drafted yet. Drafts only: never sent.
create or replace function public.outreach_followups_due(p_days integer, p_limit integer)
returns table (draft_id uuid, workspace_id uuid, contact_id uuid, lead_id uuid, purpose text, subject text, sent_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select d.id, d.workspace_id, d.contact_id, d.lead_id, d.purpose, d.subject, d.sent_at
  from public.outreach_drafts d
  where d.status = 'sent' and d.followup_of is null and d.sent_at < now() - make_interval(days => p_days)
    and not exists (select 1 from public.outreach_drafts f where f.followup_of = d.id)
    and not exists (select 1 from public.email_events e where e.draft_id = d.id and e.event in ('replied', 'unsubscribed', 'bounced', 'complained'))
  order by d.sent_at
  limit least(greatest(p_limit, 1), 100);
$$;

-- ---------- Grants ----------
revoke all on function public.outbox_claim(integer, integer) from public, anon, authenticated;
revoke all on function public.outbox_complete(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.outbox_requeue(uuid) from public, anon;
revoke all on function public.contact_outreach_eligibility(uuid, text) from public, anon;
revoke all on function public.outreach_request_send(uuid) from public, anon;
revoke all on function public.outreach_claim_send(uuid, integer) from public, anon, authenticated;
revoke all on function public.outreach_record_send(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.outreach_followups_due(integer, integer) from public, anon, authenticated;
grant execute on function public.outbox_claim(integer, integer) to service_role;
grant execute on function public.outbox_complete(uuid, boolean, text) to service_role;
grant execute on function public.outbox_requeue(uuid) to authenticated, service_role;
grant execute on function public.contact_outreach_eligibility(uuid, text) to authenticated, service_role;
grant execute on function public.outreach_request_send(uuid) to authenticated;
grant execute on function public.outreach_claim_send(uuid, integer) to service_role;
grant execute on function public.outreach_record_send(uuid, text, text, text) to service_role;
grant execute on function public.outreach_followups_due(integer, integer) to service_role;
