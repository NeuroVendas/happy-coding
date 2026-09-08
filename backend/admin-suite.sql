-- Happy Coding admin suite
-- Prepared for Supabase. Apply only after review/advisor checks.

create table if not exists public.hc_user_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  display_name text not null default '' check (char_length(display_name) <= 80),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.hc_user_directory enable row level security;
revoke all on public.hc_user_directory from anon, authenticated;
grant select on public.hc_user_directory to authenticated;
grant insert (user_id,email,display_name,last_seen_at) on public.hc_user_directory to authenticated;
grant update (email,display_name,last_seen_at) on public.hc_user_directory to authenticated;

drop policy if exists hc_directory_read on public.hc_user_directory;
create policy hc_directory_read on public.hc_user_directory for select to authenticated
using (
  user_id=(select auth.uid())
  or exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
  )
);
drop policy if exists hc_directory_insert_self on public.hc_user_directory;
create policy hc_directory_insert_self on public.hc_user_directory for insert to authenticated
with check (
  user_id=(select auth.uid())
  and lower(email)=lower(coalesce((select auth.jwt()->>'email'),''))
);
drop policy if exists hc_directory_update_self on public.hc_user_directory;
create policy hc_directory_update_self on public.hc_user_directory for update to authenticated
using (user_id=(select auth.uid()))
with check (
  user_id=(select auth.uid())
  and lower(email)=lower(coalesce((select auth.jwt()->>'email'),''))
);

create table if not exists public.hc_user_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('timeout','ban')),
  scope text not null default 'community' check (scope in ('community')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  check (user_id <> created_by),
  check ((kind='timeout' and expires_at is not null) or kind='ban'),
  check (expires_at is null or expires_at > starts_at)
);
create index if not exists hc_user_sanctions_user_active_idx on public.hc_user_sanctions(user_id,scope,created_at desc);
alter table public.hc_user_sanctions enable row level security;
revoke all on public.hc_user_sanctions from anon, authenticated;
grant select on public.hc_user_sanctions to authenticated;
grant insert (user_id,kind,scope,reason,created_by,expires_at) on public.hc_user_sanctions to authenticated;
grant update (reason,expires_at,revoked_at,revoked_by) on public.hc_user_sanctions to authenticated;

drop policy if exists hc_sanctions_read on public.hc_user_sanctions;
create policy hc_sanctions_read on public.hc_user_sanctions for select to authenticated
using (
  user_id=(select auth.uid())
  or exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
  )
);
drop policy if exists hc_sanctions_insert_admin on public.hc_user_sanctions;
create policy hc_sanctions_insert_admin on public.hc_user_sanctions for insert to authenticated
with check (
  created_by=(select auth.uid())
  and exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
  )
);
drop policy if exists hc_sanctions_update_admin on public.hc_user_sanctions;
create policy hc_sanctions_update_admin on public.hc_user_sanctions for update to authenticated
using (
  exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
  )
)
with check (
  (revoked_by is null or revoked_by=(select auth.uid()))
  and exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
  )
);

create or replace function public.hc_block_sanctioned_community_write()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_user uuid;
begin
  v_user := coalesce(
    nullif(to_jsonb(new)->>'author_id','')::uuid,
    nullif(to_jsonb(new)->>'reporter_id','')::uuid
  );
  if v_user is not null and exists (
    select 1 from public.hc_user_sanctions s
    where s.user_id=v_user
      and s.scope='community'
      and s.revoked_at is null
      and s.starts_at <= now()
      and (s.expires_at is null or s.expires_at > now())
  ) then
    raise exception 'Sua conta está temporariamente impedida de publicar na comunidade.' using errcode='P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.hc_block_sanctioned_community_write() from public, anon;
grant execute on function public.hc_block_sanctioned_community_write() to authenticated;
drop trigger if exists hc_posts_sanction_guard on public.hc_community_posts;
create trigger hc_posts_sanction_guard before insert on public.hc_community_posts
for each row execute function public.hc_block_sanctioned_community_write();
drop trigger if exists hc_reports_sanction_guard on public.hc_community_reports;
create trigger hc_reports_sanction_guard before insert on public.hc_community_reports
for each row execute function public.hc_block_sanctioned_community_write();

create table if not exists public.hc_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  level text not null default 'info' check (level in ('info','update','warning')),
  published boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
alter table public.hc_announcements enable row level security;
revoke all on public.hc_announcements from anon,authenticated;
grant select on public.hc_announcements to anon,authenticated;
grant insert,update,delete on public.hc_announcements to authenticated;
drop policy if exists hc_announcements_public_read on public.hc_announcements;
create policy hc_announcements_public_read on public.hc_announcements for select to anon,authenticated
using (published and starts_at<=now() and (ends_at is null or ends_at>now()));
drop policy if exists hc_announcements_admin_read on public.hc_announcements;
create policy hc_announcements_admin_read on public.hc_announcements for select to authenticated
using (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));
drop policy if exists hc_announcements_admin_insert on public.hc_announcements;
create policy hc_announcements_admin_insert on public.hc_announcements for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));
drop policy if exists hc_announcements_admin_update on public.hc_announcements;
create policy hc_announcements_admin_update on public.hc_announcements for update to authenticated
using (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'))
with check (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));
drop policy if exists hc_announcements_admin_delete on public.hc_announcements;
create policy hc_announcements_admin_delete on public.hc_announcements for delete to authenticated
using (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));

create table if not exists public.hc_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description)<=4000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  link_url text not null default '' check (char_length(link_url)<=2048),
  published boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
alter table public.hc_events enable row level security;
revoke all on public.hc_events from anon,authenticated;
grant select on public.hc_events to anon,authenticated;
grant insert,update,delete on public.hc_events to authenticated;
drop policy if exists hc_events_public_read on public.hc_events;
create policy hc_events_public_read on public.hc_events for select to anon,authenticated
using (published and (ends_at is null or ends_at>now()));
drop policy if exists hc_events_admin_read on public.hc_events;
create policy hc_events_admin_read on public.hc_events for select to authenticated
using (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));
drop policy if exists hc_events_admin_insert on public.hc_events;
create policy hc_events_admin_insert on public.hc_events for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));
drop policy if exists hc_events_admin_update on public.hc_events;
create policy hc_events_admin_update on public.hc_events for update to authenticated
using (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'))
with check (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));
drop policy if exists hc_events_admin_delete on public.hc_events;
create policy hc_events_admin_delete on public.hc_events for delete to authenticated
using (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));

create table if not exists public.hc_admin_audit_log (
  id bigint generated by default as identity primary key,
  admin_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(action) between 2 and 80),
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.hc_admin_audit_log enable row level security;
revoke all on public.hc_admin_audit_log from anon,authenticated;
grant select on public.hc_admin_audit_log to authenticated;
grant insert (admin_id,action,target_user_id,details) on public.hc_admin_audit_log to authenticated;
drop policy if exists hc_admin_audit_read on public.hc_admin_audit_log;
create policy hc_admin_audit_read on public.hc_admin_audit_log for select to authenticated
using (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));
drop policy if exists hc_admin_audit_insert on public.hc_admin_audit_log;
create policy hc_admin_audit_insert on public.hc_admin_audit_log for insert to authenticated
with check (admin_id=(select auth.uid()) and exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));
