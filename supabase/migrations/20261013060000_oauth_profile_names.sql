-- Social sign-in (Google, LinkedIn, GitHub): providers send the display name as `name` (Google/GitHub also `full_name`),
-- and a provider may omit email. Keep the profile insert from failing and pick up the name either way.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'name', ''), 120)
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
