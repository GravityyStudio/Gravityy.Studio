-- Compliance: consent records (append-only), suppression list (hashed, survives erasure), shared rate limiting.

-- ---------- Consent records ----------
-- One row per consent event; never updated. Withdrawal is a new row with status 'withdrawn'.
create table public.consent_records (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  contact_id      uuid not null,
  purpose         text not null check (purpose in ('enquiry', 'marketing', 'outreach')),
  basis           text not null check (basis in ('consent', 'legitimate_interest', 'contract')),
  status          text not null check (status in ('granted', 'withdrawn')),
  source          text not null check (char_length(source) between 1 and 120),   -- e.g. 'site:contact-form'
  policy_version  text not null default 'v1' check (char_length(policy_version) <= 40),
  ip_hash         text check (ip_hash ~ '^[0-9a-f]{64}$'),                          -- sha256, never the raw IP
  user_agent      text check (char_length(user_agent) <= 300),
  recorded_at     timestamptz not null default now(),
  foreign key (contact_id, workspace_id) references public.contacts (id, workspace_id) on delete cascade
);
create index consent_records_contact_idx on public.consent_records (contact_id, purpose, recorded_at desc);
create index consent_records_ws_idx on public.consent_records (workspace_id);

-- ---------- Suppression list ----------
-- Stores sha256(lower(value)) so an address stays suppressed after its contact is erased.
create table public.suppression_entries (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  kind          text not null check (kind in ('email', 'domain')),
  value_hash    text not null check (value_hash ~ '^[0-9a-f]{64}$'),
  reason        text not null check (reason in ('unsubscribed', 'bounced', 'complaint', 'manual', 'erasure')),
  note          text check (char_length(note) <= 500),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (workspace_id, kind, value_hash)
);
create index suppression_entries_created_by_idx on public.suppression_entries (created_by);

create or replace function public.suppression_hash(value text)
returns text
language sql immutable
set search_path = ''
as $$
  select encode(extensions.digest(lower(trim(value)), 'sha256'), 'hex');
$$;

-- ---------- Rate limiting (fixed window, shared across serverless instances) ----------
create table private.rate_limits (
  bucket        text primary key check (char_length(bucket) <= 200),
  window_start  timestamptz not null,
  hits          integer not null
);
alter table private.rate_limits enable row level security;
revoke all on private.rate_limits from public, anon, authenticated;

-- ponytail: fixed window allows up to 2x max across a window boundary; use a sliding log if that ever matters.
create or replace function public.rate_limit_hit(p_bucket text, p_max integer, p_window_s integer)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  insert into private.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_s) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_s) then now() else r.window_start end
  returning hits <= p_max into allowed;
  return allowed;
end $$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- ---------- Grants + RLS ----------
revoke all on public.consent_records, public.suppression_entries from anon, authenticated;
grant select on public.consent_records to authenticated;                    -- written by the server only; never updated
grant select, insert, delete on public.suppression_entries to authenticated;

alter table public.consent_records     enable row level security;
alter table public.suppression_entries enable row level security;

create policy "consent: read" on public.consent_records for select to authenticated
  using ((select private.has_workspace_role(workspace_id, 'viewer')));

create policy "suppression: read" on public.suppression_entries for select to authenticated
  using ((select private.has_workspace_role(workspace_id, 'member')));
create policy "suppression: insert" on public.suppression_entries for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id, 'member')) and created_by = (select auth.uid()));
create policy "suppression: admin delete" on public.suppression_entries for delete to authenticated
  using ((select private.has_workspace_role(workspace_id, 'admin')));
