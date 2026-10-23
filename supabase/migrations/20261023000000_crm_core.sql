-- CRM core: workspaces + membership, companies, contacts, leads (evolved in place), opportunities, activities, scores.
-- Additive only: the existing `leads` table keeps every column, so the admin kanban and site forms keep working.
-- Isolation: every CRM row carries workspace_id; cross-table references use composite (id, workspace_id) foreign keys,
-- so a row can never point at another workspace's data. RLS: viewer reads, member writes, admin deletes.

-- ---------- Helpers ----------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- Workspaces ----------
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create or replace function private.workspace_role_rank(r text)
returns integer
language sql immutable
set search_path = ''
as $$
  select case r when 'viewer' then 1 when 'member' then 2 when 'admin' then 3 when 'owner' then 4 else 0 end;
$$;

-- Platform admins (profiles.role = 'admin') keep full access to every workspace.
create or replace function private.has_workspace_role(ws uuid, min_role text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and private.workspace_role_rank(m.role) >= private.workspace_role_rank(min_role)
  );
$$;
revoke all on function private.has_workspace_role(uuid, text) from public, anon;
grant execute on function private.has_workspace_role(uuid, text) to authenticated;

-- The studio's own workspace: site forms and legacy inserts land here.
insert into public.workspaces (name, slug) values ('Gravityy Studio', 'gravityy-studio') on conflict (slug) do nothing;

create or replace function private.default_workspace_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select id from public.workspaces where slug = 'gravityy-studio';
$$;
grant usage on schema private to service_role;
revoke all on function private.default_workspace_id() from public, anon;
grant execute on function private.default_workspace_id() to authenticated, service_role;

insert into public.workspace_members (workspace_id, user_id, role)
select private.default_workspace_id(), p.id, 'owner' from public.profiles p where p.role = 'admin'
on conflict (workspace_id, user_id) do nothing;

-- ---------- Companies ----------
create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 200),
  domain        text check (domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  website       text check (char_length(website) <= 300),
  industry      text check (char_length(industry) <= 120),
  size_band     text check (size_band in ('1-10', '11-50', '51-200', '201-1000', '1000+')),
  country       text check (country ~ '^[A-Z]{2}$'),
  notes         text check (char_length(notes) <= 5000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, workspace_id)
);
create unique index companies_ws_domain_uidx on public.companies (workspace_id, domain) where domain is not null;
create index companies_ws_name_idx on public.companies (workspace_id, lower(name));

-- ---------- Contacts ----------
create table public.contacts (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  company_id         uuid,
  full_name          text not null default '' check (char_length(full_name) <= 160),
  email              text check (email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and char_length(email) <= 254),
  phone              text check (char_length(phone) <= 40),
  job_title          text check (char_length(job_title) <= 120),
  email_status       text not null default 'unverified' check (email_status in ('unverified', 'valid', 'risky', 'invalid', 'unknown')),
  email_verified_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (company_id, workspace_id) references public.companies (id, workspace_id) on delete set null (company_id)
);
create unique index contacts_ws_email_uidx on public.contacts (workspace_id, email) where email is not null;
create index contacts_company_idx on public.contacts (company_id);

-- ---------- Leads (existing table, evolved) ----------
alter table public.leads
  add column workspace_id      uuid references public.workspaces (id) on delete cascade,
  add column company_id        uuid,
  add column contact_id        uuid,
  add column owner_id          uuid references auth.users (id) on delete set null,
  add column score             smallint not null default 0 check (score between 0 and 100),
  add column qualification     text not null default 'unqualified' check (qualification in ('unqualified', 'mql', 'sql', 'disqualified')),
  add column last_activity_at  timestamptz;

update public.leads set workspace_id = private.default_workspace_id() where workspace_id is null;
alter table public.leads
  alter column workspace_id set default private.default_workspace_id(),
  alter column workspace_id set not null,
  add constraint leads_id_workspace_key unique (id, workspace_id),
  add constraint leads_company_fk foreign key (company_id, workspace_id) references public.companies (id, workspace_id) on delete set null (company_id),
  add constraint leads_contact_fk foreign key (contact_id, workspace_id) references public.contacts (id, workspace_id) on delete set null (contact_id);

-- Sources for later phases (CSV import, discovery jobs).
alter table public.leads drop constraint leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('contact', 'audit', 'referral', 'website', 'other', 'import', 'discovery'));

create index leads_ws_stage_idx on public.leads (workspace_id, stage, updated_at desc);
create index leads_contact_idx on public.leads (contact_id);
create index leads_company_idx on public.leads (company_id);
create index leads_owner_idx on public.leads (owner_id);

-- ---------- Opportunities ----------
create table public.opportunities (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  lead_id         uuid not null,
  name            text not null check (char_length(name) between 1 and 200),
  stage           text not null default 'discovery' check (stage in ('discovery', 'proposal', 'negotiation', 'won', 'lost')),
  amount_minor    integer not null default 0 check (amount_minor >= 0),
  currency        text not null default 'INR' check (currency in ('INR', 'USD')),
  probability     smallint not null default 10 check (probability between 0 and 100),
  expected_close  date,
  closed_at       timestamptz,
  owner_id        uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (lead_id, workspace_id) references public.leads (id, workspace_id) on delete cascade
);
create index opportunities_ws_stage_idx on public.opportunities (workspace_id, stage);
create index opportunities_lead_idx on public.opportunities (lead_id);
create index opportunities_owner_idx on public.opportunities (owner_id);

-- ---------- Lead activities (timeline; append-only for non-admins) ----------
create table public.lead_activities (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  lead_id       uuid not null,
  kind          text not null check (kind in ('note', 'call', 'meeting', 'email', 'stage_change', 'form_submission', 'score_change', 'system')),
  body          text check (char_length(body) <= 5000),
  meta          jsonb not null default '{}'::jsonb,
  actor_id      uuid references auth.users (id) on delete set null,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  foreign key (lead_id, workspace_id) references public.leads (id, workspace_id) on delete cascade
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, occurred_at desc);
create index lead_activities_ws_idx on public.lead_activities (workspace_id, occurred_at desc);
create index lead_activities_actor_idx on public.lead_activities (actor_id);

-- ---------- Lead scores (history; written by the server only) ----------
create table public.lead_scores (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  lead_id       uuid not null,
  score         smallint not null check (score between 0 and 100),
  factors       jsonb not null default '[]'::jsonb check (jsonb_typeof(factors) = 'array'),
  model         text not null default 'rules-v1' check (char_length(model) <= 40),
  created_at    timestamptz not null default now(),
  foreign key (lead_id, workspace_id) references public.leads (id, workspace_id) on delete cascade
);
create index lead_scores_lead_idx on public.lead_scores (lead_id, created_at desc);
create index lead_scores_ws_idx on public.lead_scores (workspace_id);

-- ---------- updated_at triggers ----------
create trigger workspaces_touch before update on public.workspaces for each row execute function private.touch_updated_at();
create trigger companies_touch before update on public.companies for each row execute function private.touch_updated_at();
create trigger contacts_touch before update on public.contacts for each row execute function private.touch_updated_at();
create trigger opportunities_touch before update on public.opportunities for each row execute function private.touch_updated_at();

-- ---------- Grants (least privilege; RLS below decides rows) ----------
-- Supabase grants ALL on new public tables to anon and authenticated by default; start from nothing.
revoke all on public.workspaces, public.workspace_members, public.companies, public.contacts,
  public.opportunities, public.lead_activities, public.lead_scores from anon, authenticated;
grant select, insert, update, delete on public.companies, public.contacts, public.opportunities to authenticated;
grant select, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, delete on public.lead_activities to authenticated;   -- no update: the timeline is append-only
grant select on public.lead_scores to authenticated;                        -- scores come from the server
revoke all on public.leads from anon;

-- ---------- RLS ----------
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies         enable row level security;
alter table public.contacts          enable row level security;
alter table public.opportunities     enable row level security;
alter table public.lead_activities   enable row level security;
alter table public.lead_scores       enable row level security;

create policy "workspaces: members read" on public.workspaces for select to authenticated using ((select private.has_workspace_role(id, 'viewer')));
create policy "workspaces: admins update" on public.workspaces for update to authenticated
  using ((select private.has_workspace_role(id, 'admin'))) with check ((select private.has_workspace_role(id, 'admin')));

create policy "members: read own workspace" on public.workspace_members for select to authenticated
  using ((select private.has_workspace_role(workspace_id, 'viewer')));
-- Admins manage members; only owners may grant or hold 'owner'.
create policy "members: admins insert" on public.workspace_members for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id, 'admin')) and (role <> 'owner' or (select private.has_workspace_role(workspace_id, 'owner'))));
create policy "members: admins update" on public.workspace_members for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'admin')) and (role <> 'owner' or (select private.has_workspace_role(workspace_id, 'owner'))))
  with check ((select private.has_workspace_role(workspace_id, 'admin')) and (role <> 'owner' or (select private.has_workspace_role(workspace_id, 'owner'))));
create policy "members: admins delete" on public.workspace_members for delete to authenticated
  using ((select private.has_workspace_role(workspace_id, 'admin')) and (role <> 'owner' or (select private.has_workspace_role(workspace_id, 'owner'))));

-- Same shape for every workspace-scoped CRM table: viewer reads, member writes, admin deletes.
create policy "companies: read" on public.companies for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "companies: insert" on public.companies for insert to authenticated with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "companies: update" on public.companies for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'member'))) with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "companies: delete" on public.companies for delete to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

create policy "contacts: read" on public.contacts for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "contacts: insert" on public.contacts for insert to authenticated with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "contacts: update" on public.contacts for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'member'))) with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "contacts: delete" on public.contacts for delete to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

create policy "opportunities: read" on public.opportunities for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "opportunities: insert" on public.opportunities for insert to authenticated with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "opportunities: update" on public.opportunities for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'member'))) with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "opportunities: delete" on public.opportunities for delete to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

create policy "activities: read" on public.lead_activities for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "activities: insert own" on public.lead_activities for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id, 'member')) and actor_id = (select auth.uid()));
create policy "activities: admin delete" on public.lead_activities for delete to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

create policy "scores: read" on public.lead_scores for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));

-- Leads: replace the platform-admin-only policies with workspace roles (platform admins still pass via has_workspace_role).
drop policy "leads: admin select" on public.leads;
drop policy "leads: admin insert" on public.leads;
drop policy "leads: admin update" on public.leads;
drop policy "leads: admin delete" on public.leads;
create policy "leads: read" on public.leads for select to authenticated using ((select private.has_workspace_role(workspace_id, 'viewer')));
create policy "leads: insert" on public.leads for insert to authenticated with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "leads: update" on public.leads for update to authenticated
  using ((select private.has_workspace_role(workspace_id, 'member'))) with check ((select private.has_workspace_role(workspace_id, 'member')));
create policy "leads: delete" on public.leads for delete to authenticated using ((select private.has_workspace_role(workspace_id, 'admin')));

-- Audit entries can now be attributed to a workspace.
alter table public.audit_log add column workspace_id uuid references public.workspaces (id) on delete set null;
create index audit_log_workspace_idx on public.audit_log (workspace_id, created_at desc);
