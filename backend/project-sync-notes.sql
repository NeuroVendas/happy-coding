-- Happy Coding =] — project notes cloud sync
-- STATUS: APPLIED to Supabase Happy Coding on 2026-09-08.
-- Migration: 20260908214414 project_sync_notes.
-- Keep RLS ownership policies audited after future changes.

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

-- No service-role key belongs in frontend code.
