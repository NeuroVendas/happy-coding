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
const apiLimitSql=read('backend/global-ai-rate-limit-v010.sql');
const desktopLock=JSON.parse(read('desktop/package-lock.json'));
const previewWorkflow=read('.github/workflows/desktop-preview.yml');
const releaseWorkflow=read('.github/workflows/desktop-windows.yml');
const dependabot=read('.github/dependabot.yml');

const CHECKOUT_SHA='11d5960a326750d5838078e36cf38b85af677262';
const SETUP_NODE_SHA='49933ea5288caeca8642d1e84afbd3f7d6820020';
const UPLOAD_SHA='ea165f8d65b6e75b540449e92b4886f43607fa02';

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

test('AI quota protection is global, backend-only and stores only a keyed hash',()=>{
  assert.ok(aiEdge.includes('hc_take_api_rate_limit'));
  assert.ok(aiEdge.includes("bucket:'ai_minute'"));
  assert.ok(aiEdge.includes("bucket:'ai_day'"));
  assert.ok(aiEdge.includes("crypto.subtle.importKey('raw'"));
  assert.ok(aiEdge.includes("{name:'HMAC',hash:'SHA-256'}"));
  assert.ok(apiLimitSql.includes('revoke all on public.hc_api_rate_limits from public, anon, authenticated'));
  assert.ok(apiLimitSql.includes('grant execute on function public.hc_take_api_rate_limit(text,text,integer,integer) to service_role'));
  assert.ok(apiLimitSql.includes('security definer'));
  assert.ok(apiLimitSql.includes("set search_path=''"));
});

test('public search uses the same backend-only global quota guard',()=>{
  assert.ok(searchEdge.includes('hc_take_api_rate_limit'));
  assert.ok(searchEdge.includes("bucket:'search_minute'"));
  assert.ok(searchEdge.includes("bucket:'search_day'"));
  assert.ok(searchEdge.includes('happy-coding-search:'));
  assert.ok(searchEdge.includes("{name:'HMAC',hash:'SHA-256'}"));
  assert.ok(searchEdge.includes("error:'search_guard_unavailable'"));
});

test('desktop dependency graph is locked and both Windows workflows use npm ci',()=>{
  assert.equal(desktopLock.lockfileVersion,3);
  assert.equal(desktopLock.name,'happy-coding-desktop');
  assert.equal(desktopLock.version,'0.10.0');
  for(const workflow of [previewWorkflow,releaseWorkflow]){
    assert.match(workflow,/npm ci --no-audit --no-fund/);
    assert.equal(/npm install --no-audit --no-fund/.test(workflow),false);
  }
  assert.match(previewWorkflow,/permissions:\s*\n\s*contents:\s*read/);
});

test('Windows CI pins third-party Actions and enforces dependency audits',()=>{
  for(const workflow of [previewWorkflow,releaseWorkflow]){
    assert.ok(workflow.includes(`actions/checkout@${CHECKOUT_SHA}`));
    assert.ok(workflow.includes(`actions/setup-node@${SETUP_NODE_SHA}`));
    assert.ok(workflow.includes(`actions/upload-artifact@${UPLOAD_SHA}`));
    assert.equal(/actions\/checkout@v4/.test(workflow),false);
    assert.equal(/actions\/setup-node@v4/.test(workflow),false);
    assert.equal(/actions\/upload-artifact@v4/.test(workflow),false);
    assert.ok(workflow.includes('npm audit --omit=dev --audit-level=high'));
    assert.ok(workflow.includes('npm audit --audit-level=critical'));
  }
});

test('preview CI verifies the packaged browser survives startup',()=>{
  assert.ok(previewWorkflow.includes('Smoke packaged browser startup'));
  assert.ok(previewWorkflow.includes("-Filter 'HappyCoding.exe'"));
  assert.ok(previewWorkflow.includes('Start-Process -FilePath $exe.FullName'));
  assert.ok(previewWorkflow.includes('Start-Sleep -Seconds 8'));
  assert.ok(previewWorkflow.includes('if ($process.HasExited)'));
});

test('Dependabot watches desktop npm and GitHub Actions weekly',()=>{
  assert.match(dependabot,/package-ecosystem:\s*npm/);
  assert.match(dependabot,/directory:\s*\/desktop/);
  assert.match(dependabot,/package-ecosystem:\s*github-actions/);
  assert.equal((dependabot.match(/interval:\s*weekly/g)||[]).length,2);
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
