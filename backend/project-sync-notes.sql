-- Happy Coding =] — project notes cloud sync
-- STATUS: PENDING. Do not assume this file has been applied to Supabase.
-- Apply through a reviewed Supabase migration, then run the security advisor.

alter table public.hc_projects
  add column if not exists notes text not null default '';

alter table public.hc_projects
  add column if not exists updated_at timestamptz not null default now();

alter table public.hc_projects
  drop constraint if exists hc_projects_engine_check;

alter table public.hc_projects
  add constraint hc_projects_engine_check
  check (char_length(engine) >= 1 and char_length(engine) <= 120);

alter table public.hc_projects
  drop constraint if exists hc_projects_notes_check;

alter table public.hc_projects
  add constraint hc_projects_notes_check
  check (char_length(notes) <= 20000);

-- Existing RLS ownership policies must remain enabled and should be re-audited
-- after this migration. No service-role key belongs in frontend code.