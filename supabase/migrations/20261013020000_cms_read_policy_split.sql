-- anon can't execute private.is_admin(), and Postgres checks that privilege even when `published` is true.
-- Give anon its own policy that never references the helper.
drop policy if exists "cms: read published" on public.cms_entries;
create policy "cms: read published (anon)" on public.cms_entries for select to anon using (published);
create policy "cms: read published or admin" on public.cms_entries for select to authenticated using (published or (select private.is_admin()));
