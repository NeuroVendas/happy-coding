'use strict';

const MAX_QUERY=512;
const MAX_RESULTS=12;

function cleanSearchQuery(raw){
  return String(raw??'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,MAX_QUERY);
}
function logicalSearchUrl(raw){
  const query=cleanSearchQuery(raw);
  return `happy://search?q=${encodeURIComponent(query)}`;
}
function googleSearchUrl(raw){
  const query=cleanSearchQuery(raw);
  return `https://www.google.com/search?hl=pt-BR&safe=active&filter=1&q=${encodeURIComponent(query)}`;
}
function unwrapGoogleUrl(raw){
  try{
    const url=new URL(String(raw||''));
    const host=url.hostname.toLowerCase();
    if(host==='google.com'||host.endsWith('.google.com')){
      if(url.pathname==='/url'){
        const target=url.searchParams.get('q')||url.searchParams.get('url');
        if(!target)return null;
        return unwrapGoogleUrl(target);
      }
      return null;
    }
    if(url.protocol==='http:')url.protocol='https:';
    if(url.protocol!=='https:')return null;
    return url.href.slice(0,4096);
  }catch{return null;}
}
function cleanText(value,max){return String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,max);}
function normalizeGoogleResults(raw){
  const list=Array.isArray(raw)?raw:[];
  const seen=new Set();
  const out=[];
  for(const item of list){
    const url=unwrapGoogleUrl(item?.url);
    const title=cleanText(item?.title,160);
    if(!url||!title||seen.has(url))continue;
    seen.add(url);
    let host='';try{host=new URL(url).hostname.replace(/^www\./,'').slice(0,120);}catch{}
    out.push({title,url,host,snippet:cleanText(item?.snippet,360)});
    if(out.length>=MAX_RESULTS)break;
  }
  return out;
}
function googleBlocked(meta){
  const href=String(meta?.href||'').toLowerCase();
  const text=String(meta?.bodyText||'').toLowerCase();
  return href.includes('/sorry/')||href.includes('consent.google.')||/unusual traffic|recaptcha|before you continue|antes de continuar|não sou um robô|nao sou um robo/.test(text);
}

module.exports=Object.freeze({MAX_QUERY,MAX_RESULTS,cleanSearchQuery,logicalSearchUrl,googleSearchUrl,unwrapGoogleUrl,normalizeGoogleResults,googleBlocked});
