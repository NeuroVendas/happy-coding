-- Public verification is a derived mirror of admin membership.
-- It exposes only the fact that an account is verified, never admin capabilities.
create table if not exists public.hc_verified_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now()
);
alter table public.hc_verified_accounts enable row level security;
revoke all on public.hc_verified_accounts from anon, authenticated;
grant select (user_id,verified_at) on public.hc_verified_accounts to anon, authenticated;
drop policy if exists hc_verified_accounts_read on public.hc_verified_accounts;
create policy hc_verified_accounts_read on public.hc_verified_accounts for select to anon, authenticated using (true);

insert into public.hc_verified_accounts(user_id)
select user_id from public.hc_admin_members
on conflict (user_id) do nothing;

create or replace function public.hc_sync_verified_account()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    insert into public.hc_verified_accounts(user_id) values(new.user_id)
    on conflict (user_id) do nothing;
    return new;
  elsif tg_op='DELETE' then
    delete from public.hc_verified_accounts where user_id=old.user_id;
    return old;
  end if;
  return null;
end;
$$;
revoke all on function public.hc_sync_verified_account() from public, anon, authenticated;
drop trigger if exists hc_admin_member_verified_sync_insert on public.hc_admin_members;
create trigger hc_admin_member_verified_sync_insert after insert on public.hc_admin_members
for each row execute function public.hc_sync_verified_account();
drop trigger if exists hc_admin_member_verified_sync_delete on public.hc_admin_members;
create trigger hc_admin_member_verified_sync_delete after delete on public.hc_admin_members
for each row execute function public.hc_sync_verified_account();

create or replace function public.hc_search_public_profiles(p_query text default '', p_limit integer default 20)
returns table(user_id uuid, username text, display_name text, bio text, verified boolean, joined_at timestamptz)
language sql stable security invoker set search_path='' as $$
  select p.user_id,p.username,p.display_name,p.bio,
         exists(select 1 from public.hc_verified_accounts v where v.user_id=p.user_id) as verified,
         p.created_at as joined_at
  from public.hc_public_profiles p
  where case when char_length(btrim(coalesce(p_query,''))) < 1 then true
    else p.username ilike '%'||btrim(p_query)||'%' or p.display_name ilike '%'||btrim(p_query)||'%' end
  order by case when lower(p.username)=lower(btrim(coalesce(p_query,''))) then 0 else 1 end,
           p.display_name asc,p.created_at asc
  limit greatest(1,least(coalesce(p_limit,20),20));
$$;

create or replace function public.hc_public_profiles_by_ids(p_ids uuid[])
returns table(user_id uuid, username text, display_name text, verified boolean)
language sql stable security invoker set search_path='' as $$
  with requested as (
    select distinct id as user_id from unnest(coalesce(p_ids,'{}'::uuid[])) as id limit 50
  )
  select r.user_id,p.username,p.display_name,
         exists(select 1 from public.hc_verified_accounts v where v.user_id=r.user_id) as verified
  from requested r left join public.hc_public_profiles p on p.user_id=r.user_id;
$$;
