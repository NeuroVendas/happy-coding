-- Happy Coding =] v0.11.0 — playtests e feedback estruturado.
-- Somente links HTTPS; sem upload de builds, arquivos, logs ou screenshots.

create table if not exists public.hc_playtests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  creator_name text not null check (char_length(btrim(creator_name)) between 2 and 40),
  project_name text not null check (char_length(btrim(project_name)) between 1 and 120),
  version_label text not null check (char_length(btrim(version_label)) between 1 and 80),
  project_url text not null check (char_length(project_url) between 9 and 2048 and project_url ~ '^https://[^[:space:]]+$'),
  feedback_prompt text not null check (char_length(btrim(feedback_prompt)) between 1 and 1000),
  instructions text not null default '' check (char_length(instructions) <= 4000),
  content_warning boolean not null default false,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hc_playtest_feedback (
  id uuid primary key default gen_random_uuid(),
  playtest_id uuid not null references public.hc_playtests(id) on delete cascade,
  tester_id uuid not null references auth.users(id) on delete cascade,
  tester_name text not null check (char_length(btrim(tester_name)) between 2 and 40),
  attempted text not null check (char_length(btrim(attempted)) between 1 and 1600),
  happened text not null check (char_length(btrim(happened)) between 1 and 2000),
  location text not null check (char_length(btrim(location)) between 1 and 800),
  steps text not null default '' check (char_length(steps) <= 2500),
  expected text not null default '' check (char_length(expected) <= 1600),
  actual text not null default '' check (char_length(actual) <= 1600),
  status text not null default 'open' check (status in ('open','planned','fixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hc_playtests_status_created_idx on public.hc_playtests(status,created_at desc);
create index if not exists hc_playtests_creator_created_idx on public.hc_playtests(creator_id,created_at desc);
create index if not exists hc_playtest_feedback_playtest_created_idx on public.hc_playtest_feedback(playtest_id,created_at desc);
create index if not exists hc_playtest_feedback_tester_created_idx on public.hc_playtest_feedback(tester_id,created_at desc);

alter table public.hc_playtests enable row level security;
alter table public.hc_playtest_feedback enable row level security;

revoke all on table public.hc_playtests from public, anon, authenticated;
revoke all on table public.hc_playtest_feedback from public, anon, authenticated;
grant select on table public.hc_playtests to anon, authenticated;
grant insert, delete on table public.hc_playtests to authenticated;
grant update(status,updated_at) on table public.hc_playtests to authenticated;
grant select, insert, delete on table public.hc_playtest_feedback to authenticated;
grant update(status,updated_at) on table public.hc_playtest_feedback to authenticated;
grant all on table public.hc_playtests to service_role;
grant all on table public.hc_playtest_feedback to service_role;

drop policy if exists hc_playtests_public_read on public.hc_playtests;
create policy hc_playtests_public_read
on public.hc_playtests for select
to anon
using (status='published');

drop policy if exists hc_playtests_authenticated_read on public.hc_playtests;
create policy hc_playtests_authenticated_read
on public.hc_playtests for select
to authenticated
using (
  status='published'
  or creator_id=(select auth.uid())
  or exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid())
      and (select auth.jwt()->>'aal')='aal2'
  )
);

drop policy if exists hc_playtests_insert_self on public.hc_playtests;
create policy hc_playtests_insert_self
on public.hc_playtests for insert
to authenticated
with check (
  creator_id=(select auth.uid())
  and status='pending'
  and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false'
  and coalesce((select auth.jwt()->>'email'),'')<>''
);

drop policy if exists hc_playtests_delete_self on public.hc_playtests;
create policy hc_playtests_delete_self
on public.hc_playtests for delete
to authenticated
using (creator_id=(select auth.uid()));

drop policy if exists hc_playtests_admin_moderate on public.hc_playtests;
create policy hc_playtests_admin_moderate
on public.hc_playtests for update
to authenticated
using (
  exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid())
      and (select auth.jwt()->>'aal')='aal2'
  )
)
with check (
  exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid())
      and (select auth.jwt()->>'aal')='aal2'
  )
);

drop policy if exists hc_playtest_feedback_read on public.hc_playtest_feedback;
create policy hc_playtest_feedback_read
on public.hc_playtest_feedback for select
to authenticated
using (
  tester_id=(select auth.uid())
  or exists (
    select 1 from public.hc_playtests p
    where p.id=playtest_id and p.creator_id=(select auth.uid())
  )
  or exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid())
      and (select auth.jwt()->>'aal')='aal2'
  )
);

drop policy if exists hc_playtest_feedback_insert_self on public.hc_playtest_feedback;
create policy hc_playtest_feedback_insert_self
on public.hc_playtest_feedback for insert
to authenticated
with check (
  tester_id=(select auth.uid())
  and status='open'
  and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false'
  and coalesce((select auth.jwt()->>'email'),'')<>''
  and exists (
    select 1 from public.hc_playtests p
    where p.id=playtest_id and p.status='published'
  )
);

drop policy if exists hc_playtest_feedback_triage on public.hc_playtest_feedback;
create policy hc_playtest_feedback_triage
on public.hc_playtest_feedback for update
to authenticated
using (
  exists (
    select 1 from public.hc_playtests p
    where p.id=playtest_id and p.creator_id=(select auth.uid())
  )
  or exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid())
      and (select auth.jwt()->>'aal')='aal2'
  )
)
with check (
  exists (
    select 1 from public.hc_playtests p
    where p.id=playtest_id and p.creator_id=(select auth.uid())
  )
  or exists (
    select 1 from public.hc_admin_members a
    where a.user_id=(select auth.uid())
      and (select auth.jwt()->>'aal')='aal2'
  )
);

drop policy if exists hc_playtest_feedback_delete_self on public.hc_playtest_feedback;
create policy hc_playtest_feedback_delete_self
on public.hc_playtest_feedback for delete
to authenticated
using (tester_id=(select auth.uid()));

create or replace function public.hc_normalize_playtest()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  new.creator_name:=btrim(new.creator_name);
  new.project_name:=btrim(new.project_name);
  new.version_label:=btrim(new.version_label);
  new.project_url:=btrim(new.project_url);
  new.feedback_prompt:=btrim(new.feedback_prompt);
  new.instructions:=btrim(new.instructions);
  if tg_op='UPDATE' then new.updated_at:=now(); end if;
  return new;
end;
$$;

create or replace function public.hc_normalize_playtest_feedback()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  new.tester_name:=btrim(new.tester_name);
  new.attempted:=btrim(new.attempted);
  new.happened:=btrim(new.happened);
  new.location:=btrim(new.location);
  new.steps:=btrim(new.steps);
  new.expected:=btrim(new.expected);
  new.actual:=btrim(new.actual);
  if tg_op='UPDATE' then new.updated_at:=now(); end if;
  return new;
end;
$$;

create or replace function public.hc_block_sanctioned_playtest_write()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_user uuid;
begin
  v_user:=coalesce(
    nullif(to_jsonb(new)->>'creator_id','')::uuid,
    nullif(to_jsonb(new)->>'tester_id','')::uuid
  );
  if v_user is not null and exists (
    select 1 from public.hc_user_sanctions s
    where s.user_id=v_user
      and s.scope='community'
      and s.revoked_at is null
      and s.starts_at<=now()
      and (s.expires_at is null or s.expires_at>now())
  ) then
    raise exception 'Sua conta está temporariamente impedida de publicar na comunidade.' using errcode='P0001';
  end if;
  return new;
end;
$$;

create or replace function public.hc_limit_playtest_submission()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.creator_id::text,11));
  if (select count(*) from public.hc_playtests where creator_id=new.creator_id and created_at>now()-interval '1 hour')>=5 then
    raise exception 'Aguarde antes de publicar mais playtests.' using errcode='P0001';
  end if;
  return new;
end;
$$;

create or replace function public.hc_limit_playtest_feedback()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.tester_id::text,12));
  if (select count(*) from public.hc_playtest_feedback where tester_id=new.tester_id and created_at>now()-interval '1 hour')>=20 then
    raise exception 'Aguarde antes de enviar mais relatos de playtest.' using errcode='P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists hc_playtests_normalize on public.hc_playtests;
create trigger hc_playtests_normalize before insert or update on public.hc_playtests for each row execute function public.hc_normalize_playtest();
drop trigger if exists hc_playtests_sanction_guard on public.hc_playtests;
create trigger hc_playtests_sanction_guard before insert on public.hc_playtests for each row execute function public.hc_block_sanctioned_playtest_write();
drop trigger if exists hc_playtests_rate_limit on public.hc_playtests;
create trigger hc_playtests_rate_limit before insert on public.hc_playtests for each row execute function public.hc_limit_playtest_submission();

drop trigger if exists hc_playtest_feedback_normalize on public.hc_playtest_feedback;
create trigger hc_playtest_feedback_normalize before insert or update on public.hc_playtest_feedback for each row execute function public.hc_normalize_playtest_feedback();
drop trigger if exists hc_playtest_feedback_sanction_guard on public.hc_playtest_feedback;
create trigger hc_playtest_feedback_sanction_guard before insert on public.hc_playtest_feedback for each row execute function public.hc_block_sanctioned_playtest_write();
drop trigger if exists hc_playtest_feedback_rate_limit on public.hc_playtest_feedback;
create trigger hc_playtest_feedback_rate_limit before insert on public.hc_playtest_feedback for each row execute function public.hc_limit_playtest_feedback();

comment on table public.hc_playtests is 'Moderated HTTPS playtest publications. Happy Coding does not host executable builds here.';
comment on table public.hc_playtest_feedback is 'Structured private playtest feedback visible to tester, creator and authorized moderators.';
