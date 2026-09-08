-- Transactional fixtures only; nothing from this test is retained.
begin;
select set_config('hc.test_a',gen_random_uuid()::text,true),set_config('hc.test_b',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at) values
  (current_setting('hc.test_a')::uuid,'hc-test-a-'||current_setting('hc.test_a')||'@example.invalid',now()),
  (current_setting('hc.test_b')::uuid,'hc-test-b-'||current_setting('hc.test_b')||'@example.invalid',now());
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('hc.test_a'),'role','authenticated','email','test@example.invalid','aal','aal1','is_anonymous',false)::text,true);
set local role authenticated;
insert into public.hc_community_posts(author_id,author_name,kind,title,body,code)
values (current_setting('hc.test_a')::uuid,'Test A','code','Teste privado','Somente o autor pode ler antes da revisão.','<script>alert("never executed")</script>');
do $$ begin
  if (select count(*) from public.hc_community_posts where author_id=current_setting('hc.test_a')::uuid and status='pending')<>1 then raise exception 'Owner cannot see own submission';end if;
  begin
    insert into public.hc_community_posts(author_id,author_name,kind,title,body,status) values(current_setting('hc.test_a')::uuid,'Test A','discussion','Bypass','Must fail','published');
    raise exception 'Direct publish allowed';
  exception when insufficient_privilege then null;end;
  update public.hc_community_posts set status='published' where author_id=current_setting('hc.test_a')::uuid;
  if found then raise exception 'Author can self-publish';end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('hc.test_b'),'role','authenticated','email','test@example.invalid','aal','aal1','is_anonymous',false)::text,true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.hc_community_posts where author_id=current_setting('hc.test_a')::uuid) then raise exception 'Other user can read private post';end if;
  delete from public.hc_community_posts where author_id=current_setting('hc.test_a')::uuid;
  if found then raise exception 'Other user can delete private post';end if;
  begin
    insert into public.hc_community_posts(author_id,author_name,kind,title,body) values(current_setting('hc.test_a')::uuid,'Fake','discussion','Impersonation','Must fail');
    raise exception 'Author impersonation allowed';
  exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  if exists(select 1 from public.hc_community_posts where author_id=current_setting('hc.test_a')::uuid) then raise exception 'Anonymous can read pending';end if;
end $$;
reset role;
insert into public.hc_admin_members(user_id) values(current_setting('hc.test_b')::uuid);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('hc.test_b'),'role','authenticated','email','test@example.invalid','aal','aal1')::text,true);
set local role authenticated;
do $$ begin
  update public.hc_community_posts set status='published' where author_id=current_setting('hc.test_a')::uuid;
  if found then raise exception 'Admin bypassed MFA';end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('hc.test_b'),'role','authenticated','email','test@example.invalid','aal','aal2')::text,true);
set local role authenticated;
do $$ begin
  update public.hc_community_posts set status='published' where author_id=current_setting('hc.test_a')::uuid;
  if not found then raise exception 'Verified admin cannot moderate';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  if (select count(*) from public.hc_community_posts where author_id=current_setting('hc.test_a')::uuid and status='published')<>1 then raise exception 'Public feed cannot read approved post';end if;
end $$;
reset role;
rollback;
select 'Community RLS checks passed; fixtures rolled back' as result;
