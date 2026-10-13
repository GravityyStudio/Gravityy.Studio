-- Project milestones shown in the client portal (/portal/projects). Edited by admins on the project record.
-- Shape: [{ "title": text, "due": "YYYY-MM-DD" | null, "done": boolean }]
alter table public.projects
  add column if not exists milestones jsonb not null default '[]'::jsonb
  check (jsonb_typeof(milestones) = 'array');
