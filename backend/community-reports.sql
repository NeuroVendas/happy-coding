-- Happy Coding community reports. Applied to the Happy Coding Supabase project on 2026-09-08.
create table if not exists public.hc_community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.hc_community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('adult','harassment','hate','real_violence','self_harm','personal_data','spam','other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  unique(post_id, reporter_id)
);
create index if not exists hc_community_reports_status_idx on public.hc_community_reports(status,created_at desc,id desc);
create index if not exists hc_community_reports_reporter_idx on public.hc_community_reports(reporter_id,created_at desc);
alter table public.hc_community_reports enable row level security;
revoke all on public.hc_community_reports from anon, authenticated;
grant select on public.hc_community_reports to authenticated;
grant insert (post_id,reporter_id,reason,details) on public.hc_community_reports to authenticated;
grant update (status) on public.hc_community_reports to authenticated;

create policy hc_report_read on public.hc_community_reports for select to authenticated
using (reporter_id=(select auth.uid()) or exists (
  select 1 from public.hc_admin_members a
  where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
));
create policy hc_report_submit on public.hc_community_reports for insert to authenticated
with check (
  reporter_id=(select auth.uid())
  and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false'
  and coalesce((select auth.jwt()->>'email'),'')<>''
  and exists (
    select 1 from public.hc_community_posts p
    where p.id=post_id and p.status='published' and p.author_id<>(select auth.uid())
  )
);
create policy hc_report_moderate on public.hc_community_reports for update to authenticated
using (exists (
  select 1 from public.hc_admin_members a
  where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
))
with check (exists (
  select 1 from public.hc_admin_members a
  where a.user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
));

create or replace function public.hc_limit_community_report() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.reporter_id::text,1));
  if (select count(*) from public.hc_community_reports where reporter_id=new.reporter_id and created_at>now()-interval '1 hour') >= 10 then
    raise exception 'Aguarde antes de enviar mais denúncias.' using errcode='P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.hc_limit_community_report() from public,anon,authenticated;
create trigger hc_community_report_limit before insert on public.hc_community_reports
for each row execute function public.hc_limit_community_report();