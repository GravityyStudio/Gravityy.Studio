-- Free website audits (audit form → PageSpeed Insights + on-page checks → report page + email to the requester).
-- One row per accepted request. Written only by trusted server code (service role) after the form has passed
-- validation, the honeypot and rate limits. Reports are opened by an unguessable token through the server: there is
-- no anon/authenticated policy, so browsers can never list or read audits directly. Admins can read every row.

create table public.site_audits (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (length(token) >= 32),
  url text not null check (length(url) <= 500),
  email text not null check (length(email) <= 320),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  psi jsonb,      -- compact PageSpeed results: { mobile, desktop } (scores, vitals, top opportunities)
  findings jsonb, -- on-page checks from lib/discovery/analyze.ts
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  emailed_at timestamptz
);

create index site_audits_created_at_idx on public.site_audits (created_at desc);
create index site_audits_email_idx on public.site_audits (lower(email));

alter table public.site_audits enable row level security;
revoke all on public.site_audits from anon, authenticated;
grant select on public.site_audits to authenticated;
create policy site_audits_admin_read on public.site_audits for select to authenticated using ((select private.is_admin()));
