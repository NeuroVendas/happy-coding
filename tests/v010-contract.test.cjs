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
const supabaseConfig=read('supabase/config.toml');
const aiEdge=read('edge-functions/ai-chat/index.ts');
const searchEdge=read('edge-functions/web-search/index.ts');

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

test('public edge functions use publishable-key auth without pretending it is a JWT',()=>{
  assert.match(supabaseConfig,/\[functions\.ai-chat\][\s\S]*verify_jwt\s*=\s*false/);
  assert.match(supabaseConfig,/\[functions\.web-search\][\s\S]*verify_jwt\s*=\s*false/);
  for(const source of [aiEdge,searchEdge]){
    assert.match(source,/req\.headers\.get\('apikey'\)\s*!==\s*PUBLIC_KEY/);
    assert.ok(source.includes("ALLOWED_ORIGIN='https://neurovendas.github.io'")||source.includes("ALLOWED_ORIGIN = 'https://neurovendas.github.io'"));
  }
  assert.ok(cloud.includes("'apikey':KEY"));
  assert.equal(/Authorization\s*:\s*`?Bearer\s+\$?\{?KEY/i.test(cloud),false);
});

test('Gemini secret stays server-side and modern Supabase backend keys are supported',()=>{
  assert.ok(aiEdge.includes('SUPABASE_SECRET_KEYS'));
  assert.ok(aiEdge.includes('hc_get_ai_secret'));
  assert.ok(aiEdge.includes("if(!service.startsWith('sb_secret_'))headers.Authorization"));
  assert.equal(/happy_coding_gemini|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/.test(cloud),false);
  assert.equal(/happy_coding_gemini|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/.test(search),false);
});

test('cloud AI is configured for low latency with a stable fallback',()=>{
  assert.ok(aiEdge.includes("'gemini-3.5-flash-lite'"));
  assert.ok(aiEdge.includes("'gemini-3.1-flash-lite'"));
  assert.ok(aiEdge.indexOf("'gemini-3.5-flash-lite'")<aiEdge.indexOf("'gemini-3.1-flash-lite'"));
  assert.match(aiEdge,/thinkingConfig:\{thinkingLevel:'minimal'\}/);
  assert.ok(aiEdge.includes('ATTEMPT_TIMEOUTS'));
  assert.equal(/temperature\s*:/.test(aiEdge),false);
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

test('admin badges are omitted when a visible post cannot resolve to one unique author id',()=>{
  assert.ok(community.includes("new Set(matches.map(p=>p.author_id).filter(Boolean))"));
  assert.ok(community.includes('if(authorIds.length!==1)continue'));
  assert.ok(community.includes("new Date(p.created_at).toLocaleDateString('pt-BR')"));
});

test('brand icon is the green Happy Coding face',()=>{
  assert.ok(icon.includes('#b7f34a'));
  assert.ok(icon.includes('=]'));
  assert.equal(/atom|electron/i.test(icon),false);
});
