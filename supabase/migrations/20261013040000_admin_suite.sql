-- Admin suite: leads, subscriptions, projects, tickets, blog posts, add-ons, audit log, media storage.
-- RLS pattern: one SELECT policy per role, admin writes split by command, (select auth.uid()) / private.is_admin().

-- ---------- Leads (sales pipeline) ----------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  company     text,
  phone       text,
  source      text not null default 'website' check (source in ('contact', 'audit', 'referral', 'website', 'other')),
  stage       text not null default 'new' check (stage in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  value_minor integer not null default 0 check (value_minor >= 0),
  currency    text not null default 'INR' check (currency in ('INR', 'USD')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists leads_stage_idx on public.leads (stage, updated_at desc);

-- ---------- Subscriptions (retainers / Grow plans) ----------
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.profiles (id) on delete cascade,
  plan_id            text references public.plans (id) on delete set null,
  status             text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  amount_minor       integer not null check (amount_minor >= 0),
  currency           text not null default 'INR' check (currency in ('INR', 'USD')),
  interval           text not null default 'month' check (interval in ('month', 'year')),
  provider           text not null default 'manual' check (provider in ('manual', 'razorpay', 'stripe')),
  provider_ref       text,
  started_at         date not null default current_date,
  current_period_end date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists subscriptions_client_idx on public.subscriptions (client_id);
create index if not exists subscriptions_plan_idx on public.subscriptions (plan_id);
create unique index if not exists subscriptions_client_plan_live_idx on public.subscriptions (client_id, plan_id) where status <> 'cancelled';

-- ---------- Projects ----------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.profiles (id) on delete set null,
  name         text not null,
  status       text not null default 'planning' check (status in ('planning', 'in_progress', 'review', 'delivered', 'on_hold')),
  progress     integer not null default 0 check (progress between 0 and 100),
  due_date     date,
  budget_minor integer not null default 0 check (budget_minor >= 0),
  currency     text not null default 'INR' check (currency in ('INR', 'USD')),
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists projects_client_idx on public.projects (client_id);

-- ---------- Tickets & requests ----------
create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.profiles (id) on delete set null,
  subject     text not null check (char_length(subject) between 3 and 160),
  body        text check (char_length(body) <= 5000),
  kind        text not null default 'support' check (kind in ('support', 'request')),
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  response    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tickets_client_idx on public.tickets (client_id);
create index if not exists tickets_status_idx on public.tickets (status);

-- ---------- Blog ----------
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null,
  excerpt      text,
  cover_url    text,
  body         text not null default '',
  published    boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- Add-ons (shown on /pricing) ----------
create table if not exists public.addons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price_minor integer not null check (price_minor > 0),
  currency    text not null default 'INR' check (currency in ('INR', 'USD')),
  region      public.billing_region not null default 'IN',
  active      boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Audit log ----------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_email text,
  action      text not null,
  entity      text not null,
  entity_id   text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);

-- ---------- RLS ----------
alter table public.leads         enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects      enable row level security;
alter table public.tickets       enable row level security;
alter table public.posts         enable row level security;
alter table public.addons        enable row level security;
alter table public.audit_log     enable row level security;

-- leads: admin only (forms insert through the server's service role)
create policy "leads: admin select" on public.leads for select to authenticated using ((select private.is_admin()));
create policy "leads: admin insert" on public.leads for insert to authenticated with check ((select private.is_admin()));
create policy "leads: admin update" on public.leads for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "leads: admin delete" on public.leads for delete to authenticated using ((select private.is_admin()));

-- subscriptions / projects: client reads own, admin manages
create policy "subscriptions: read own or admin" on public.subscriptions for select to authenticated using (client_id = (select auth.uid()) or (select private.is_admin()));
create policy "subscriptions: admin insert" on public.subscriptions for insert to authenticated with check ((select private.is_admin()));
create policy "subscriptions: admin update" on public.subscriptions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "subscriptions: admin delete" on public.subscriptions for delete to authenticated using ((select private.is_admin()));

create policy "projects: read own or admin" on public.projects for select to authenticated using (client_id = (select auth.uid()) or (select private.is_admin()));
create policy "projects: admin insert" on public.projects for insert to authenticated with check ((select private.is_admin()));
create policy "projects: admin update" on public.projects for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "projects: admin delete" on public.projects for delete to authenticated using ((select private.is_admin()));

-- tickets: clients open their own (status forced 'open', no staff response), admin manages
create policy "tickets: read own or admin" on public.tickets for select to authenticated using (client_id = (select auth.uid()) or (select private.is_admin()));
create policy "tickets: client or admin insert" on public.tickets for insert to authenticated
  with check ((select private.is_admin()) or (client_id = (select auth.uid()) and status = 'open' and response is null));
create policy "tickets: admin update" on public.tickets for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "tickets: admin delete" on public.tickets for delete to authenticated using ((select private.is_admin()));

-- posts / addons: public reads published/active, admin manages
create policy "posts: read published (anon)" on public.posts for select to anon using (published);
create policy "posts: read published or admin" on public.posts for select to authenticated using (published or (select private.is_admin()));
create policy "posts: admin insert" on public.posts for insert to authenticated with check ((select private.is_admin()));
create policy "posts: admin update" on public.posts for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "posts: admin delete" on public.posts for delete to authenticated using ((select private.is_admin()));

create policy "addons: read active (anon)" on public.addons for select to anon using (active);
create policy "addons: read active or admin" on public.addons for select to authenticated using (active or (select private.is_admin()));
create policy "addons: admin insert" on public.addons for insert to authenticated with check ((select private.is_admin()));
create policy "addons: admin update" on public.addons for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "addons: admin delete" on public.addons for delete to authenticated using ((select private.is_admin()));

-- audit log: admins read; admins append as themselves (system events use the service role)
create policy "audit: admin select" on public.audit_log for select to authenticated using ((select private.is_admin()));
create policy "audit: admin insert self" on public.audit_log for insert to authenticated with check ((select private.is_admin()) and actor_id = (select auth.uid()));

-- ---------- Marketing read API now includes active add-ons ----------
create or replace function public.cms_published_all()
returns jsonb
language sql stable security invoker set search_path = public
as $$
  select jsonb_build_object(
    'entries', coalesce((select jsonb_object_agg(key, value) from public.cms_entries where published), '{}'::jsonb),
    'plans',   coalesce((select jsonb_agg(to_jsonb(p) order by p.sort, p.id) from public.plans p where p.active), '[]'::jsonb),
    'addons',  coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'description', a.description, 'price_minor', a.price_minor, 'currency', a.currency, 'region', a.region) order by a.sort, a.name) from public.addons a where a.active), '[]'::jsonb)
  );
$$;
revoke all on function public.cms_published_all() from public;
grant execute on function public.cms_published_all() to anon, authenticated;

-- ---------- Media storage (public read, admin write) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "media: admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (select private.is_admin()));
create policy "media: admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and (select private.is_admin())) with check (bucket_id = 'media' and (select private.is_admin()));
create policy "media: admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and (select private.is_admin()));
create policy "media: admin list" on storage.objects for select to authenticated using (bucket_id = 'media' and (select private.is_admin()));
