-- Happy Coding only. Community beta: submissions are never published automatically.
create table public.hc_community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(btrim(author_name)) between 2 and 32),
  kind text not null check (kind in ('discussion','code','project')),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  code text not null default '' check (char_length(code) <= 20000),
  content_warning boolean not null default false,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);
create index hc_community_feed_idx on public.hc_community_posts (status,created_at desc,id desc);
create index hc_community_author_idx on public.hc_community_posts (author_id,created_at desc);
alter table public.hc_community_posts enable row level security;
revoke all on public.hc_community_posts from anon, authenticated;
grant select on public.hc_community_posts to anon, authenticated;
grant insert (author_id,author_name,kind,title,body,code,content_warning) on public.hc_community_posts to authenticated;
grant delete on public.hc_community_posts to authenticated;
grant update (status) on public.hc_community_posts to authenticated;

create policy community_public_read on public.hc_community_posts for select to anon
using (status='published');
create policy community_read on public.hc_community_posts for select to authenticated
using (status='published' or author_id=(select auth.uid()) or exists (
  select 1 from public.hc_admin_members a where a.user_id=(select auth.uid())
  and (select auth.jwt()->>'aal')='aal2'
));
create policy community_submit on public.hc_community_posts for insert to authenticated
with check (author_id=(select auth.uid()) and status='pending'
  and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false'
  and coalesce((select auth.jwt()->>'email'),'')<>'');
create policy community_remove on public.hc_community_posts for delete to authenticated
using (author_id=(select auth.uid()));
create policy community_moderate on public.hc_community_posts for update to authenticated
using (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'))
with check (exists (select 1 from public.hc_admin_members a where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'));

create function public.hc_limit_community_submission() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.author_id::text,0));
  if (select count(*) from public.hc_community_posts where author_id=new.author_id and created_at>now()-interval '1 hour') >= 5 then
    raise exception 'Aguarde antes de enviar mais posts.' using errcode='P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.hc_limit_community_submission() from public,anon,authenticated;
create trigger hc_community_submission_limit before insert on public.hc_community_posts
for each row execute function public.hc_limit_community_submission();
