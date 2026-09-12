'use strict';
const {randomUUID}=require('node:crypto');
const MAX_RECORDS=100;
const text=(value,max=2000)=>String(value??'').slice(0,max);
function target(raw){
  try{
    const value=text(raw,4096).trim();
    const u=new URL(/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(value)?`http://${value}`:value);
    if(u.username||u.password)return null;
    if(u.protocol!=='https:'&&!(u.protocol==='http:'&&isLocal(u)))return null;
    if(/porn|xvideos|xnxx|hentai|rule34|nhentai/i.test(u.hostname))return null;
    if(/(^|\.)google\.[a-z.]+$/.test(u.hostname)&&u.pathname==='/search')u.searchParams.set('safe','active');
    if(/(^|\.)bing\.com$/.test(u.hostname)&&u.pathname==='/search')u.searchParams.set('adlt','strict');
    return u.href;
  }catch{return null;}
}
function isLocal(u){try{return ['localhost','127.0.0.1','[::1]'].includes((u instanceof URL?u:new URL(u)).hostname);}catch{return false;}}
function redact(value){return text(value,4000).replace(/(Bearer\s+)[^\s"']+/gi,'$1[oculto]').replace(/((?:token|password|secret|authorization|api[_-]?key)\s*[=:]\s*)[^\s&,"']+/gi,'$1[oculto]').replace(/([?&][^=\s]+)=([^&\s]+)/g,'$1=[oculto]');}
function safeUrl(value){try{const u=new URL(value);u.search='';u.hash='';u.username='';u.password='';return u.href;}catch{return'';}}
function project(value={}){
  const url=target(value.url);if(!url)throw Error('Use HTTPS ou HTTP em localhost/127.0.0.1.');
  const references=(Array.isArray(value.references)?value.references:[]).slice(0,30).map(r=>({title:text(r.title,120),url:target(r.url),note:text(r.note),license:text(r.license,200)})).filter(r=>r.url);
  return{id:/^[a-z0-9-]{1,80}$/i.test(value.id)?value.id:randomUUID(),name:text(value.name,80).trim()||new URL(url).hostname,url,version:text(value.version,80),docs:target(value.docs)||'',references};
}
function steps(value){return(Array.isArray(value)?value:[]).slice(0,30).map(s=>s?.type==='navigate'?{type:'navigate',url:target(s.url)}:s?.type==='click'?{type:'click',selector:text(s.selector,500)}:s?.type==='assert'?{type:'assert',selector:text(s.selector,500),expected:text(s.expected,500)}:null).filter(s=>s&&(s.type!=='navigate'||s.url));}
function normalize(value){return{projects:(Array.isArray(value?.projects)?value.projects:[]).slice(0,MAX_RECORDS).flatMap(p=>{try{return[project(p)];}catch{return[];}}),tests:(Array.isArray(value?.tests)?value.tests:[]).slice(0,MAX_RECORDS).filter(t=>target(t.url)).map(t=>({name:text(t.name,80),url:target(t.url),steps:steps(t.steps)}))};}
function authorized(event,panel,url){return !!panel&&event.sender===panel.webContents&&event.senderFrame===panel.webContents.mainFrame&&event.senderFrame.url===url;}
module.exports={target,isLocal,text,redact,safeUrl,project,steps,normalize,authorized,MAX_RECORDS};
