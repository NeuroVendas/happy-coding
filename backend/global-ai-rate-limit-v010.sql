-- Happy Coding v0.10: global backend-only rate limiting for public AI endpoints.
-- Applied to project vzfnoaixjgyifutklpwn as migration global_ai_rate_limit_v010.
-- The explicit deny policy was applied separately as explicit_deny_api_rate_limits_v010.
create table if not exists public.hc_api_rate_limits (
  bucket text not null,
  subject_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (bucket, subject_hash, window_start),
  constraint hc_api_rate_limits_bucket_len check (char_length(bucket) between 1 and 40),
  constraint hc_api_rate_limits_subject_len check (char_length(subject_hash) between 32 and 128),
  constraint hc_api_rate_limits_count_positive check (request_count > 0)
);

alter table public.hc_api_rate_limits enable row level security;
revoke all on public.hc_api_rate_limits from public, anon, authenticated;
drop policy if exists hc_api_rate_limits_deny_client on public.hc_api_rate_limits;
create policy hc_api_rate_limits_deny_client
on public.hc_api_rate_limits
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.hc_take_api_rate_limit(
  p_bucket text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_bucket is null or char_length(p_bucket) < 1 or char_length(p_bucket) > 40 then
    return false;
  end if;
  if p_subject_hash is null or char_length(p_subject_hash) < 32 or char_length(p_subject_hash) > 128 then
    return false;
  end if;
  if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 604800 then
    return false;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.hc_api_rate_limits(bucket,subject_hash,window_start,request_count,updated_at)
  values(p_bucket,p_subject_hash,v_window_start,1,clock_timestamp())
  on conflict(bucket,subject_hash,window_start)
  do update set request_count=public.hc_api_rate_limits.request_count+1,
                updated_at=clock_timestamp()
  returning request_count into v_count;

  -- Probabilistic cleanup keeps the table bounded without a scheduled job.
  if random() < 0.02 then
    delete from public.hc_api_rate_limits
    where window_start < clock_timestamp() - interval '8 days';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.hc_take_api_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.hc_take_api_rate_limit(text,text,integer,integer) to service_role;
