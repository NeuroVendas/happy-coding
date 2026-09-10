'use strict';

const MAX_CONSOLE=200;
const MAX_NETWORK=250;
const SENSITIVE_QUERY=/^(access[_-]?token|auth|authorization|code|credential|jwt|key|password|passwd|secret|session|sig|signature|token)$/i;
const VIEWPORT_PRESETS=Object.freeze({
  full:null,
  laptop:Object.freeze({label:'Laptop',width:1280,height:720}),
  tablet:Object.freeze({label:'Tablet',width:768,height:1024}),
  mobile:Object.freeze({label:'Mobile',width:390,height:844}),
  android:Object.freeze({label:'Android',width:412,height:915})
});

function text(value,max=1000){return String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ').trim().slice(0,max);}
function redactSensitiveText(value,max=3000){
  return text(value,max)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,'[REDACTED_TOKEN]')
    .replace(/((?:access[_-]?token|authorization|password|passwd|secret|session|api[_-]?key|apikey)\s*[:=]\s*)[^\s,;&]+/gi,'$1[REDACTED]');
}
function safeDevUrl(value){
  try{
    const url=new URL(text(value,4096));
    if(!['http:','https:'].includes(url.protocol))return'';
    url.username='';url.password='';url.hash='';
    for(const key of [...url.searchParams.keys()])if(SENSITIVE_QUERY.test(key))url.searchParams.set(key,'[REDACTED]');
    return url.href.slice(0,4096);
  }catch{return'';}
}
function cleanLevel(value){const level=text(value,20).toLowerCase();return['error','warning','info','debug'].includes(level)?level:'info';}
function sanitizeConsoleEntry(raw={}){
  return{id:text(raw.id,80),level:cleanLevel(raw.level),message:redactSensitiveText(raw.message,2400),source:safeDevUrl(raw.source),line:Math.max(0,Math.min(10_000_000,Math.floor(Number(raw.line)||0))),at:Math.max(0,Number(raw.at)||Date.now())};
}
function sanitizeNetworkEntry(raw={}){
  const status=Math.max(0,Math.min(999,Math.floor(Number(raw.status)||0)));
  return{id:text(raw.id,80),method:text(raw.method,16).toUpperCase()||'GET',url:safeDevUrl(raw.url),type:text(raw.type,40),status,duration:Math.max(0,Math.min(3_600_000,Math.round(Number(raw.duration)||0))),fromCache:!!raw.fromCache,error:redactSensitiveText(raw.error,300),at:Math.max(0,Number(raw.at)||Date.now())};
}
function problemCounts(consoleEntries=[],networkEntries=[]){const consoleErrors=consoleEntries.filter(item=>cleanLevel(item?.level)==='error').length,consoleWarnings=consoleEntries.filter(item=>cleanLevel(item?.level)==='warning').length,failedRequests=networkEntries.filter(item=>Number(item?.status)>=400||!!item?.error).length;return{consoleErrors,consoleWarnings,failedRequests,total:consoleErrors+failedRequests};}
function normalizeViewport(raw){if(!raw||raw.preset==='full')return null;if(raw.preset&&VIEWPORT_PRESETS[raw.preset])return{preset:raw.preset,...VIEWPORT_PRESETS[raw.preset]};const width=Math.max(240,Math.min(1920,Math.round(Number(raw.width)||0))),height=Math.max(320,Math.min(1440,Math.round(Number(raw.height)||0)));if(!width||!height)return null;return{preset:'custom',label:'Custom',width,height};}
function buildDevAiPrompt(kind,raw){
  if(kind==='console'){const item=sanitizeConsoleEntry(raw);return `Analise este erro selecionado explicitamente pelo usuário no Dev Mode do Happy Coding. Não assuma acesso ao restante da página, arquivos, cookies ou computador. Explique a causa provável, como confirmar e os próximos passos de correção.\n\nCONSOLE\nNível: ${item.level}\nMensagem: ${item.message||'(vazia)'}\nFonte: ${item.source||'(não informada)'}${item.line?`\nLinha: ${item.line}`:''}`.slice(0,4000);}
  const item=sanitizeNetworkEntry(raw);return `Analise esta requisição de rede selecionada explicitamente pelo usuário no Dev Mode do Happy Coding. Dados sensíveis foram removidos e nenhum header, cookie, token, body ou arquivo foi compartilhado. Explique o que o status/erro indica, causas prováveis e como investigar/corrigir.\n\nNETWORK\n${item.method} ${item.url||'(URL indisponível)'}\nStatus: ${item.status||'sem status'}\nTipo: ${item.type||'desconhecido'}\nDuração: ${item.duration} ms${item.error?`\nErro: ${item.error}`:''}`.slice(0,4000);
}
function issueDraft(kind,raw,answer=''){const prompt=buildDevAiPrompt(kind,raw);return `## Diagnóstico — Happy Coding =]\n\n${prompt.replace(/^Analise[^\n]*\n\n/,'')}\n\n### Análise =]\n${redactSensitiveText(answer,6000)||'Sem análise gerada.'}`.slice(0,9000);}
module.exports=Object.freeze({MAX_CONSOLE,MAX_NETWORK,VIEWPORT_PRESETS,text,redactSensitiveText,safeDevUrl,sanitizeConsoleEntry,sanitizeNetworkEntry,problemCounts,normalizeViewport,buildDevAiPrompt,issueDraft});
