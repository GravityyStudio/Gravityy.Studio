-- Hardening after Supabase advisors (security + performance).

-- 1) RBAC helper lives in a schema PostgREST doesn't expose → usable in policies, not callable via /rest/v1/rpc.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;

-- 2) Policies: (select auth.uid()) evaluated once per query; one SELECT policy per role on plans.
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or private.is_admin());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated using (id = (select auth.uid()) or private.is_admin())
  with check (id = (select auth.uid()) or private.is_admin());

drop policy if exists "cms: admin all" on public.cms_entries;
create policy "cms: read published" on public.cms_entries
  for select to anon, authenticated using (published or (select private.is_admin()));
create policy "cms: admin insert" on public.cms_entries for insert to authenticated with check ((select private.is_admin()));
create policy "cms: admin update" on public.cms_entries for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "cms: admin delete" on public.cms_entries for delete to authenticated using ((select private.is_admin()));

drop policy if exists "plans: read active" on public.plans;
drop policy if exists "plans: admin write" on public.plans;
create policy "plans: read active (anon)" on public.plans for select to anon using (active);
create policy "plans: read active or admin" on public.plans for select to authenticated using (active or (select private.is_admin()));
create policy "plans: admin insert" on public.plans for insert to authenticated with check ((select private.is_admin()));
create policy "plans: admin update" on public.plans for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "plans: admin delete" on public.plans for delete to authenticated using ((select private.is_admin()));

drop policy if exists "invoices: read own or admin" on public.invoices;
create policy "invoices: read own or admin" on public.invoices
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));

drop function if exists public.is_admin();

-- 3) Marketing read API runs with the caller's rights: RLS above already limits it to published/active rows.
create or replace function public.cms_published_all()
returns jsonb
language sql stable security invoker set search_path = public
as $$
  select jsonb_build_object(
    'entries', coalesce((select jsonb_object_agg(key, value) from public.cms_entries where published), '{}'::jsonb),
    'plans',   coalesce((select jsonb_agg(to_jsonb(p) order by p.sort, p.id) from public.plans p where p.active), '[]'::jsonb)
  );
$$;
revoke all on function public.cms_published_all() from public;
grant execute on function public.cms_published_all() to anon, authenticated;

-- 4) Trigger-only functions are not an API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;

-- 5) Cover foreign keys.
create index if not exists cms_entries_updated_by_idx on public.cms_entries (updated_by);
create index if not exists invoices_plan_id_idx on public.invoices (plan_id);
