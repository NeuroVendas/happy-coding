const ALLOWED_ORIGIN = 'https://neurovendas.github.io';
const PUBLIC_KEY = 'sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
const MAX_QUERY = 240;
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

type Result = { title: string; url: string; snippet: string };
type Probe = { name: string; status: number; bytes: number; contentType: string; finalHost: string; parsed: number };

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripTags(value: string) {
  return decodeEntities(value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}
function cleanQuery(raw: unknown) {
  return String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);
}
function safetyDecision(query: string) {
  const q=query.toLowerCase();
  if(/\b(porn|porno|pornografia|hentai|nudes?|sexo expl[ií]cito|rule\s?34|xvideos|xnxx|nhentai)\b/i.test(q))
    return {blocked:true,category:'adult',message:'Não posso localizar conteúdo sexual explícito. Posso ajudar com educação, saúde, segurança online ou outro tema apropriado.'};
  if(/\b(como|m[eé]todo|jeito)\b.{0,55}\b(me matar|suic[ií]dio|automutila|cortar meus pulsos)\b/i.test(q))
    return {blocked:true,category:'self_harm',message:'Não posso orientar métodos de automutilação ou suicídio. Posso ajudar com informações de segurança e apoio.'};
  if(/\b(como fazer|como construir|fabricar|montar)\b.{0,70}\b(bomba|explosivo|arma caseira|veneno letal)\b/i.test(q))
    return {blocked:true,category:'real_harm',message:'Não posso fornecer instruções para construir armas, explosivos ou causar dano real. Posso explicar segurança, prevenção ou princípios gerais sem instruções perigosas.'};
  if(/\b(roubar|furtar|steal|capturar)\b.{0,45}\b(senha|password|cookie|token|credencial)\b/i.test(q)||/\b(criar|fazer|build)\b.{0,45}\b(ransomware|stealer|keylogger)\b/i.test(q))
    return {blocked:true,category:'cyber_abuse',message:'Não posso ajudar a roubar credenciais, criar malware ou invadir contas. Posso ajudar com defesa, detecção, hardening e testes autorizados.'};
  return {blocked:false,category:'',message:''};
}
function safeExternalUrl(raw: string, base?: string) {
  try {
    const url = new URL(decodeEntities(raw).trim(), base);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const host = url.hostname.toLowerCase();
    if (!host || host === 'localhost') return '';
    url.hash = '';
    return url.href.slice(0, 2048);
  } catch { return ''; }
}
function directGoogleUrl(raw: string) {
  try {
    const candidate = new URL(decodeEntities(raw).trim(), 'https://www.google.com');
    let href = candidate.href;
    if (candidate.hostname.endsWith('google.com') && candidate.pathname === '/url') href = candidate.searchParams.get('q') || candidate.searchParams.get('url') || '';
    const out = safeExternalUrl(href); if (!out) return '';
    const host = new URL(out).hostname.toLowerCase();
    if (host === 'google.com' || host.endsWith('.google.com') || host.endsWith('.googleusercontent.com')) return '';
    return out;
  } catch { return ''; }
}
function directDuckUrl(raw: string) {
  try {
    const candidate = new URL(decodeEntities(raw).trim(), 'https://duckduckgo.com');
    if (candidate.hostname.endsWith('duckduckgo.com') && candidate.pathname.startsWith('/l/')) {
      const target = candidate.searchParams.get('uddg'); return target ? safeExternalUrl(target) : '';
    }
    const out = safeExternalUrl(candidate.href); if (!out) return '';
    return new URL(out).hostname.toLowerCase().endsWith('duckduckgo.com') ? '' : out;
  } catch { return ''; }
}
function unique(results: Result[]) {
  const out: Result[] = [], seen = new Set<string>();
  for (const item of results) {
    if (!item.title || !item.url || seen.has(item.url)) continue;
    seen.add(item.url); out.push(item); if (out.length >= 12) break;
  }
  return out;
}
function parseGoogle(html: string) {
  const out: Result[] = [];
  const anchor = /<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?<h3\b[^>]*>[\s\S]*?<\/h3>[\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(html)) && out.length < 18) {
    const h3 = match[3].match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i); if (!h3) continue;
    const title = stripTags(h3[1]).slice(0, 180), url = directGoogleUrl(match[2]); if (!title || !url) continue;
    const nearby = html.slice(anchor.lastIndex, anchor.lastIndex + 2600);
    const blocks = [...nearby.matchAll(/<(?:div|span)\b[^>]*>([\s\S]{20,900}?)<\/(?:div|span)>/gi)].map(m => stripTags(m[1])).filter(t => t.length >= 35 && t !== title);
    out.push({ title, url, snippet: (blocks.find(t => t.length <= 420) || '').slice(0, 420) });
  }
  return unique(out);
}
function parseBingRss(xml: string) {
  const out: Result[] = [];
  for (const item of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const body = item[1];
    const tm = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const lm = body.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
    if (!tm || !lm) continue;
    const title = stripTags(tm[1]).slice(0,180), url = safeExternalUrl(stripTags(lm[1]));
    if (!title || !url) continue;
    const dm = body.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i);
    const snippet = dm ? stripTags(dm[1]).slice(0,420) : '';
    out.push({title,url,snippet});
  }
  return unique(out);
}
function parseBing(html: string) {
  const out: Result[] = [];
  const block = /<li\b[^>]*class=(['"])[^'"]*\bb_algo\b[^'"]*\1[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = block.exec(html)) && out.length < 18) {
    const body = match[2];
    const titleMatch = body.match(/<h2\b[^>]*>[\s\S]*?<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i); if (!titleMatch) continue;
    const title = stripTags(titleMatch[3]).slice(0, 180), url = safeExternalUrl(titleMatch[2]); if (!title || !url) continue;
    const host = new URL(url).hostname.toLowerCase(); if (host.endsWith('bing.com') || host.endsWith('microsoft.com')) continue;
    const p = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    out.push({ title, url, snippet: p ? stripTags(p[1]).slice(0, 420) : '' });
  }
  return unique(out);
}
function parseDuck(html: string) {
  const out: Result[] = [];
  const anchor = /<a\b[^>]*class=(['"])[^'"]*\bresult__a\b[^'"]*\1[^>]*href=(['"])(.*?)\2[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(html)) && out.length < 18) {
    const title = stripTags(match[4]).slice(0,180), url = directDuckUrl(match[3]); if (!title || !url) continue;
    const nearby = html.slice(anchor.lastIndex, anchor.lastIndex + 1800);
    const s = nearby.match(/<(?:a|div)\b[^>]*class=(['"])[^'"]*\bresult__snippet\b[^'"]*\1[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    out.push({title,url,snippet:s?stripTags(s[2]).slice(0,420):''});
  }
  return unique(out);
}
function requestIp(req: Request) {
  return (req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown').trim().slice(0, 80);
}
function rateLimited(req: Request) {
  const now = Date.now();
  const ip = requestIp(req);
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) { buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS }); return false; }
  current.count += 1; return current.count > RATE_LIMIT;
}
function backendKey() {
  try {
    const modern=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const key=modern?.default||Object.values(modern||{})[0];
    if(typeof key==='string'&&key)return key;
  } catch {}
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
}
function backendHeaders(service:string) {
  const headers:Record<string,string>={'Content-Type':'application/json','apikey':service};
  if(!service.startsWith('sb_secret_'))headers.Authorization=`Bearer ${service}`;
  return headers;
}
async function hmacSubject(service:string,req:Request) {
  try {
    const encoder=new TextEncoder();
    const key=await crypto.subtle.importKey('raw',encoder.encode(service),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const signed=await crypto.subtle.sign('HMAC',key,encoder.encode(`happy-coding-search:${requestIp(req)}`));
    return Array.from(new Uint8Array(signed)).map(v=>v.toString(16).padStart(2,'0')).join('');
  } catch { return ''; }
}
async function globalRateGuard(req:Request) {
  const url=Deno.env.get('SUPABASE_URL')||'';
  const service=backendKey();
  if(!url||!service)return{ok:false,limited:false};
  const subject=await hmacSubject(service,req);
  if(!subject)return{ok:false,limited:false};
  const rules=[{bucket:'search_minute',limit:60,seconds:60},{bucket:'search_day',limit:2000,seconds:86400}];
  for(const rule of rules) {
    try {
      const response=await fetch(`${url}/rest/v1/rpc/hc_take_api_rate_limit`,{method:'POST',headers:backendHeaders(service),body:JSON.stringify({p_bucket:rule.bucket,p_subject_hash:subject,p_limit:rule.limit,p_window_seconds:rule.seconds})});
      if(!response.ok)return{ok:false,limited:false};
      const allowed=await response.json();
      if(allowed!==true)return{ok:false,limited:true};
    } catch { return{ok:false,limited:false}; }
  }
  return{ok:true,limited:false};
}
async function fetchPage(url: URL, timeoutMs = 9000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7'
    }});
    const text = await response.text();
    return {status:response.status,text,contentType:response.headers.get('content-type')||'',finalUrl:response.url};
  } catch { return {status:0,text:'',contentType:'',finalUrl:''}; }
  finally { clearTimeout(timer); }
}
function probe(name:string,page:{status:number;text:string;contentType:string;finalUrl:string},parsed:number):Probe {
  let finalHost=''; try{finalHost=new URL(page.finalUrl).hostname;}catch{}
  return {name,status:page.status,bytes:page.text.length,contentType:page.contentType.slice(0,80),finalHost,parsed};
}
async function search(query: string) {
  const diagnostics: Probe[]=[]; const collected: Result[]=[];
  const google = new URL('https://www.google.com/search');
  google.searchParams.set('q', query); google.searchParams.set('safe', 'active'); google.searchParams.set('filter', '1'); google.searchParams.set('pws', '0'); google.searchParams.set('hl', 'pt-BR'); google.searchParams.set('gl', 'py'); google.searchParams.set('num', '12');
  const gp=await fetchPage(google); const g=gp.status===200?parseGoogle(gp.text):[]; diagnostics.push(probe('primary',gp,g.length)); collected.push(...g); if(g.length>=5)return{results:unique(g),diagnostics};
  const rss = new URL('https://www.bing.com/search');
  rss.searchParams.set('q',query);rss.searchParams.set('format','rss');rss.searchParams.set('adlt','strict');rss.searchParams.set('count','12');rss.searchParams.set('setlang','pt-BR');
  const rp=await fetchPage(rss);const r=rp.status===200?parseBingRss(rp.text):[];diagnostics.push(probe('fallback-rss',rp,r.length));collected.push(...r);if(r.length>=3)return{results:unique([...collected]),diagnostics};
  const bing = new URL('https://www.bing.com/search');
  bing.searchParams.set('q', query); bing.searchParams.set('adlt', 'strict'); bing.searchParams.set('count', '12'); bing.searchParams.set('setlang', 'pt-BR');
  const bp=await fetchPage(bing); const b=bp.status===200?parseBing(bp.text):[]; diagnostics.push(probe('fallback-html',bp,b.length)); collected.push(...b); if(unique(collected).length>=3)return{results:unique(collected),diagnostics};
  const duck = new URL('https://html.duckduckgo.com/html/');
  duck.searchParams.set('q', query); duck.searchParams.set('kp', '1'); duck.searchParams.set('kl', 'br-pt');
  const dp=await fetchPage(duck); const d=dp.status===200?parseDuck(dp.text):[]; diagnostics.push(probe('fallback-lite',dp,d.length)); collected.push(...d);
  return {results:unique(collected),diagnostics};
}
function compactSentence(text:string){const clean=stripTags(text).replace(/\s+/g,' ').trim();if(!clean)return'';const pieces=clean.split(/(?<=[.!?])\s+/).filter(Boolean);return (pieces.slice(0,2).join(' ')||clean).slice(0,520);}
function composeAnswer(results:Result[]){
  const chosen:{text:string;source:number}[]=[];const seen=new Set<string>();
  for(let i=0;i<results.length&&chosen.length<3;i++){
    const text=compactSentence(results[i].snippet);if(text.length<35)continue;
    const key=text.toLowerCase().slice(0,120);if(seen.has(key))continue;seen.add(key);chosen.push({text,source:i+1});
  }
  if(!chosen.length)return null;
  return {kind:'source_summary',text:chosen.map(x=>`${x.text} [${x.source}]`).join(' '),sourceIndexes:chosen.map(x=>x.source)};
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    if (origin && origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);
  if (origin && origin !== ALLOWED_ORIGIN) return json({ error: 'origin_not_allowed' }, 403, origin);
  if (req.headers.get('apikey') !== PUBLIC_KEY) return json({ error: 'unauthorized' }, 401, origin);
  if (rateLimited(req)) return json({ error: 'rate_limited', message: 'Muitas pesquisas em pouco tempo. Aguarde um minuto e tente novamente.' }, 429, origin);
  let payload: { q?: unknown } = {}; try { payload = await req.json(); } catch { return json({ error: 'invalid_json' }, 400, origin); }
  const query = cleanQuery(payload.q); if (!query) return json({ error: 'empty_query' }, 400, origin);
  const safety=safetyDecision(query);if(safety.blocked)return json({error:'blocked_query',message:safety.message,safety:{category:safety.category}},400,origin);
  const guard=await globalRateGuard(req);
  if(!guard.ok){
    if(guard.limited)return json({error:'rate_limited',message:'Limite de pesquisas atingido para esta conexão. Tente novamente mais tarde.'},429,origin);
    return json({error:'search_guard_unavailable',message:'A proteção da busca está indisponível agora. Tente novamente em alguns segundos.'},503,origin);
  }
  const {results,diagnostics} = await search(query);
  if (!results.length) return json({ error: 'search_unavailable', message: 'Não foi possível concluir esta pesquisa agora. Tente novamente em alguns segundos.', diagnostics }, 503, origin);
  return json({ query, safeSearch: true, answer:composeAnswer(results), results }, 200, origin);
});