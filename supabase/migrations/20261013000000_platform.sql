-- Gravityy Studio platform: auth profiles + RBAC, CMS, plans (server-side pricing), invoices, webhook idempotency.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor. Then run supabase/seed.sql.

create extension if not exists pgcrypto;

-- ---------- Types ----------
do $$ begin
  create type public.app_role as enum ('client', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.billing_region as enum ('IN', 'GLOBAL');
exception when duplicate_object then null; end $$;

-- ---------- Profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        public.app_role not null default 'client',
  region      public.billing_region not null default 'IN',
  created_at  timestamptz not null default now()
);

-- RBAC helper. SECURITY DEFINER so policies can call it without recursing through profiles' own RLS.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- New auth user → profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Clients may edit their own name/region but never their role.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------- CMS ----------
create table if not exists public.cms_entries (
  key         text primary key,                -- e.g. 'services', 'faq', 'pricing'
  value       jsonb not null,
  published   boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

-- ---------- Plans (the only source of truth for prices) ----------
create table if not exists public.plans (
  id            text primary key,              -- e.g. 'build-in', 'grow-global'
  name          text not null,
  region        public.billing_region not null,
  currency      text not null check (currency in ('INR', 'USD')),
  amount_minor  integer not null check (amount_minor > 0),  -- paise / cents, before tax
  interval      text not null check (interval in ('one_time', 'month')),
  gst_rate      numeric(5, 4) not null default 0 check (gst_rate >= 0 and gst_rate < 1),
  active        boolean not null default true,
  sort          integer not null default 0,
  updated_at    timestamptz not null default now()
);

-- ---------- Invoices (written only by verified webhooks via the service role) ----------
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  number          bigint generated always as identity unique,
  user_id         uuid references public.profiles (id) on delete set null,
  email           text,
  plan_id         text references public.plans (id) on delete set null,
  provider        text not null check (provider in ('razorpay', 'stripe')),
  provider_ref    text not null,               -- Razorpay payment id / Stripe checkout session id
  currency        text not null,
  subtotal_minor  integer not null,
  tax_minor       integer not null default 0,
  total_minor     integer not null,
  status          text not null default 'paid' check (status in ('paid', 'refunded')),
  snapshot        jsonb not null,              -- plan + price exactly as charged
  created_at      timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index if not exists invoices_user_id_idx on public.invoices (user_id, created_at desc);

-- ---------- Webhook idempotency ----------
create table if not exists public.webhook_events (
  provider     text not null,
  event_id     text not null,
  received_at  timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ---------- Row Level Security ----------
alter table public.profiles       enable row level security;
alter table public.cms_entries    enable row level security;
alter table public.plans          enable row level security;
alter table public.invoices       enable row level security;
alter table public.webhook_events enable row level security;   -- no policies: service role only

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "cms: admin all" on public.cms_entries;
create policy "cms: admin all" on public.cms_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "plans: read active" on public.plans;
create policy "plans: read active" on public.plans
  for select to anon, authenticated using (active or public.is_admin());

drop policy if exists "plans: admin write" on public.plans;
create policy "plans: admin write" on public.plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "invoices: read own or admin" on public.invoices;
create policy "invoices: read own or admin" on public.invoices
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- Public read API for the marketing site (ISR) ----------
-- One round trip: every published CMS entry + every active plan (so displayed prices = charged prices).
create or replace function public.cms_published_all()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'entries', coalesce((select jsonb_object_agg(key, value) from public.cms_entries where published), '{}'::jsonb),
    'plans',   coalesce((select jsonb_agg(to_jsonb(p) order by p.sort, p.id) from public.plans p where p.active), '[]'::jsonb)
  );
$$;

revoke all on function public.cms_published_all() from public;
grant execute on function public.cms_published_all() to anon, authenticated;
