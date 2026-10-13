-- The role guard targets API users (anon/authenticated JWTs), the only path for self-escalation.
-- Trusted contexts (SQL editor / postgres, service_role) may change roles, e.g. to promote the first admin.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') in ('anon', 'authenticated')
     and not private.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;

revoke execute on function public.guard_profile_role() from public, anon, authenticated;
