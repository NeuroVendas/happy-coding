'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..');
const read=file=>readFileSync(resolve(root,file),'utf8');
const sync=read('sync-hook.js');
const community=read('community.js');
const profiles=read('community-v010.js');
const safety=read('safety-ui.js');

test('community, public profiles and safety tools share the persistent local auth key',()=>{
  const key='happyCoding.community.auth.v1';
  for(const source of [sync,community,profiles,safety])assert.ok(source.includes(key));
  assert.match(community,/storage:localStorage/);
  assert.match(profiles,/storage:localStorage/);
  assert.match(safety,/storage:localStorage/);
  assert.equal(/storage:sessionStorage/.test(safety),false);
});

test('safety client does not own token refresh and does not process auth callback URLs',()=>{
  assert.match(safety,/autoRefreshToken:false/);
  assert.match(safety,/detectSessionInUrl:false/);
  assert.match(safety,/persistSession:true/);
});

test('report lookup refuses ambiguous posts instead of selecting a lookalike',()=>{
  assert.ok(safety.includes('const exact=data.filter(p=>p.body===body);return exact.length===1?exact[0]:null'));
  assert.ok(safety.includes('return data.length===1?data[0]:null'));
  assert.equal(safety.includes('return data[0];'),false);
});

test('moderator gate uses Supabase MFA assurance API and exact admin membership',()=>{
  assert.ok(safety.includes('mfa.getAuthenticatorAssuranceLevel()'));
  assert.ok(safety.includes("aal?.currentLevel!=='aal2'"));
  assert.ok(safety.includes("from('hc_admin_members')"));
  assert.equal(/JSON\.parse\(atob\(session\.access_token/.test(safety),false);
});

test('legacy duplicate search implementation is removed from safety module',()=>{
  assert.equal(safety.includes('/functions/v1/web-search'),false);
  assert.equal(safety.includes('hcRunSearch'),false);
});
