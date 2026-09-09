-- Happy Coding v0.10 public profiles and server-owned verification.
-- Applied to project vzfnoaixjgyifutklpwn as migration community_profiles_and_ai_v010.
create table if not exists public.hc_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hc_public_profiles_username_format check (
    username = lower(username)
    and username ~ '^[a-z0-9_]{3,24}$'
  ),
  constraint hc_public_profiles_display_name_len check (char_length(btrim(display_name)) between 2 and 40),
  constraint hc_public_profiles_bio_len check (char_length(bio) <= 280)
);

alter table public.hc_public_profiles enable row level security;
revoke all on public.hc_public_profiles from anon, authenticated;
grant select on public.hc_public_profiles to anon, authenticated;
grant insert (user_id,username,display_name,bio) on public.hc_public_profiles to authenticated;
grant update (username,display_name,bio,updated_at) on public.hc_public_profiles to authenticated;

drop policy if exists hc_public_profiles_read on public.hc_public_profiles;
create policy hc_public_profiles_read on public.hc_public_profiles
for select to anon, authenticated using (true);

drop policy if exists hc_public_profiles_insert_self on public.hc_public_profiles;
create policy hc_public_profiles_insert_self on public.hc_public_profiles
for insert to authenticated with check (user_id=(select auth.uid()));

drop policy if exists hc_public_profiles_update_self on public.hc_public_profiles;
create policy hc_public_profiles_update_self on public.hc_public_profiles
for update to authenticated using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

create or replace function public.hc_touch_public_profile()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.username := lower(btrim(new.username));
  new.display_name := btrim(new.display_name);
  new.bio := btrim(new.bio);
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.hc_touch_public_profile() from public, anon, authenticated;
drop trigger if exists hc_public_profile_touch on public.hc_public_profiles;
create trigger hc_public_profile_touch before insert or update on public.hc_public_profiles
for each row execute function public.hc_touch_public_profile();

create or replace function public.hc_search_public_profiles(p_query text default '', p_limit integer default 20)
returns table(user_id uuid, username text, display_name text, bio text, verified boolean, joined_at timestamptz)
language sql stable security definer set search_path='' as $$
  select p.user_id,p.username,p.display_name,p.bio,
         exists(select 1 from public.hc_admin_members a where a.user_id=p.user_id) as verified,
         p.created_at as joined_at
  from public.hc_public_profiles p
  where case when char_length(btrim(coalesce(p_query,''))) < 1 then true
    else p.username ilike '%'||btrim(p_query)||'%' or p.display_name ilike '%'||btrim(p_query)||'%' end
  order by case when lower(p.username)=lower(btrim(coalesce(p_query,''))) then 0 else 1 end,
           p.display_name asc,p.created_at asc
  limit greatest(1,least(coalesce(p_limit,20),20));
$$;
revoke all on function public.hc_search_public_profiles(text,integer) from public;
grant execute on function public.hc_search_public_profiles(text,integer) to anon, authenticated;

create or replace function public.hc_public_profiles_by_ids(p_ids uuid[])
returns table(user_id uuid, username text, display_name text, verified boolean)
language sql stable security definer set search_path='' as $$
  with requested as (
    select distinct id as user_id from unnest(coalesce(p_ids,'{}'::uuid[])) as id limit 50
  )
  select r.user_id,p.username,p.display_name,
         exists(select 1 from public.hc_admin_members a where a.user_id=r.user_id) as verified
  from requested r left join public.hc_public_profiles p on p.user_id=r.user_id;
$$;
revoke all on function public.hc_public_profiles_by_ids(uuid[]) from public;
grant execute on function public.hc_public_profiles_by_ids(uuid[]) to anon, authenticated;

-- The AI provider key is stored in Supabase Vault as happy_coding_gemini.
-- Only service_role can ask this function for the decrypted value; browser roles cannot execute it.
create or replace function public.hc_get_ai_secret()
returns text language sql stable security definer set search_path='' as $$
  select decrypted_secret from vault.decrypted_secrets
  where name='happy_coding_gemini' order by created_at desc limit 1;
$$;
revoke all on function public.hc_get_ai_secret() from public, anon, authenticated;
grant execute on function public.hc_get_ai_secret() to service_role;
