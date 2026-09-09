'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..');
const read=file=>readFileSync(resolve(root,file),'utf8');
const sync=read('sync-hook.js');
const search=read('search-v010.js');
const cloud=read('cloud-ai.js');
const cleanup=read('v010-cleanup.js');
const community=read('community-v010.js');
const icon=read('icon.svg');

test('v0.10 bootstrap loads replacement behavior before legacy app handlers',()=>{
  for(const file of ['search-v010.js','cloud-ai.js','v010-cleanup.js','community-v010.js'])assert.ok(sync.includes(file),file);
  assert.ok(sync.includes('document.write'), 'v0.10 scripts must register while parser is before app.js');
});

test('answer-first search is internal, source-grounded, and upgrades to cloud AI when available',()=>{
  assert.ok(search.includes('/functions/v1/web-search'));
  assert.ok(search.includes('/functions/v1/ai-chat'));
  assert.ok(search.includes("payload?.answer?.text"));
  assert.ok(search.includes("'Resumo das fontes'"));
  assert.ok(search.includes("'IA · fontes da busca'"));
  assert.ok(search.includes("payload?.error==='blocked_query'"));
  assert.ok(search.includes('stopImmediatePropagation'));
});

test('cloud assistant has no local model download and only explicit project context',()=>{
  assert.ok(cloud.includes('/functions/v1/ai-chat'));
  assert.equal(/HuggingFace|transformers|pipeline\(|SmolLM|Baixando (o )?modelo/i.test(cloud),false);
  for(const command of ['/sem-projeto','/contexto','/projeto'])assert.ok(cloud.includes(command));
  assert.ok(cloud.includes('nenhum arquivo é lido automaticamente'));
});

test('legacy v0.0.1 example projects are removed from the visible experience',()=>{
  for(const id of ['soulbound','pixel-forge','quiet-forest'])assert.ok(cleanup.includes(id));
  assert.ok(cleanup.includes('Nenhum projeto ainda.'));
});

test('community user discovery gets admin verification from server RPCs, never client metadata',()=>{
  assert.ok(community.includes('hc_search_public_profiles'));
  assert.ok(community.includes('hc_public_profiles_by_ids'));
  assert.ok(community.includes('✓ Admin'));
  assert.equal(/user_metadata.*verified|verified.*user_metadata/i.test(community),false);
  assert.ok(community.includes('Seu e-mail nunca aparece aqui.'));
});

test('brand icon is the green Happy Coding face',()=>{
  assert.ok(icon.includes('#b7f34a'));
  assert.ok(icon.includes('=]'));
  assert.equal(/atom|electron/i.test(icon),false);
});
