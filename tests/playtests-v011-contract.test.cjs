'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..');
const read=file=>readFileSync(resolve(root,file),'utf8');
const sync=read('sync-hook.js');
const playtests=read('playtests-v011.js');
const css=read('playtests-v011.css');
const sql=read('backend/playtests-v011.sql');
const sw=read('sw.js');

test('v0.11 web shell loads playtests and caches their assets',()=>{
  assert.ok(sync.includes('playtests-v011.js'));
  assert.ok(sync.includes('playtests-v011.css'));
  assert.ok(sw.includes("'./playtests-v011.js'"));
  assert.ok(sw.includes("'./playtests-v011.css'"));
  assert.ok(css.includes('.hc-playtests'));
});

test('playtest publication is HTTPS-link based, moderated and does not upload builds',()=>{
  assert.ok(playtests.includes("from('hc_playtests')"));
  assert.ok(playtests.includes("protocol!=='https:'"));
  assert.ok(playtests.includes('parsed.username||parsed.password'));
  assert.ok(playtests.includes("host.endsWith('.localhost')"));
  assert.ok(sql.includes("project_url !~* '^https://"));
  assert.ok(playtests.includes("status:'pending'"));
  assert.ok(playtests.includes("'published'"));
  assert.ok(playtests.includes('O Happy Coding não hospeda o build nesta fase'));
  assert.equal(/FormData|FileReader|input[^\n]+type=['\"]file|storage\.from\(/i.test(playtests),false);
});

test('tester reviews structured feedback before sending and creator can triage it',()=>{
  assert.ok(playtests.includes('Revise o relato antes de enviar'));
  for(const field of ['attempted','happened','location','steps','expected','actual'])assert.ok(playtests.includes(field),field);
  for(const state of ["'open'","'planned'","'fixed'"])assert.ok(playtests.includes(state),state);
  assert.ok(playtests.includes('Vou corrigir'));
  assert.ok(playtests.includes('Corrigido'));
});

test('AI analysis is explicit opt-in and previews the exact request body',()=>{
  assert.ok(playtests.includes('Nada é enviado até você confirmar'));
  assert.ok(playtests.includes('JSON.stringify(request,null,2)'));
  assert.ok(playtests.includes("history:[]"));
  assert.ok(playtests.includes("context:{name:"));
  assert.ok(playtests.includes("'/functions/v1/ai-chat'" ) || playtests.includes('/functions/v1/ai-chat'));
  assert.ok(playtests.includes('sem nome do tester'));
  assert.equal(/service_role|SUPABASE_SECRET_KEYS|happy_coding_gemini/.test(playtests),false);
});

test('database schema enables RLS, explicit grants and ownership rules',()=>{
  assert.ok(sql.includes('alter table public.hc_playtests enable row level security'));
  assert.ok(sql.includes('alter table public.hc_playtest_feedback enable row level security'));
  assert.ok(sql.includes('revoke all on table public.hc_playtests from public, anon, authenticated'));
  assert.ok(sql.includes('grant select on table public.hc_playtests to anon, authenticated'));
  assert.ok(sql.includes('creator_id=(select auth.uid())'));
  assert.ok(sql.includes('tester_id=(select auth.uid())'));
  assert.ok(sql.includes("p.status='published'"));
  assert.ok(sql.includes("project_url ~ '^https://"));
  assert.ok(sql.includes('grant update(status,updated_at) on table public.hc_playtest_feedback to authenticated'));
});

test('playtest writes reuse community sanctions and apply submission rate limits',()=>{
  assert.ok(sql.includes('hc_block_sanctioned_playtest_write'));
  assert.ok(sql.includes("s.scope='community'"));
  assert.ok(sql.includes('hc_limit_playtest_submission'));
  assert.ok(sql.includes('hc_limit_playtest_feedback'));
  assert.ok(sql.includes("interval '1 hour'"));
});
