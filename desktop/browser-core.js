'use strict';

const HOME='https://neurovendas.github.io/happy-coding/';
const SEARCH='https://www.google.com/search?safe=active&q=';
const MAX_INPUT=4096;

function compactInput(raw){return String(raw??'').trim().slice(0,MAX_INPUT);}
function searchTarget(value){return `${SEARCH}${encodeURIComponent(value)}`;}
function looksLikeHost(value){return /^(localhost|([a-z0-9-]+\.)+[a-z]{2,})(:\d{1,5})?(\/.*)?$/i.test(value);}
function safeTarget(raw){
  const value=compactInput(raw);
  if(!value||/^happy:\/\/home$/i.test(value))return HOME;
  if(!/^[a-z][a-z0-9+.-]*:/i.test(value)){
    if(!looksLikeHost(value))return searchTarget(value);
    try{return new URL(`https://${value}`).href;}catch{return searchTarget(value);}
  }
  try{
    const url=new URL(value);
    if(url.protocol==='https:')return url.href;
    if(url.protocol==='http:'){url.protocol='https:';return url.href;}
  }catch{}
  return searchTarget(value);
}
function cleanTitle(value,fallback='Nova aba'){
  const title=String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();
  return (title||fallback).slice(0,80);
}
function nextTabId(ids,currentId,direction=1){
  if(!Array.isArray(ids)||ids.length===0)return null;
  const current=Math.max(0,ids.indexOf(currentId));
  const step=direction<0?-1:1;
  return ids[(current+step+ids.length)%ids.length];
}

module.exports=Object.freeze({HOME,SEARCH,MAX_INPUT,safeTarget,cleanTitle,nextTabId});
