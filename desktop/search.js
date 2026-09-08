'use strict';
const queryEl=document.getElementById('query');
const statusEl=document.getElementById('status');
const resultsEl=document.getElementById('results');

function clean(value,max){return String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,max);}
function render(payload){
  const query=clean(payload?.query,512)||'Pesquisa';
  const results=Array.isArray(payload?.results)?payload.results.slice(0,12):[];
  const error=clean(payload?.error,320);
  queryEl.textContent=query;
  resultsEl.replaceChildren();
  if(error){statusEl.textContent=error;statusEl.hidden=false;}
  else if(results.length){statusEl.textContent=`${results.length} resultado${results.length===1?'':'s'} do Google`;statusEl.hidden=false;}
  else{statusEl.textContent='Nenhum resultado disponível para esta pesquisa.';statusEl.hidden=false;}
  for(const item of results){
    const link=document.createElement('a');link.className='result';link.href=String(item?.url||'');
    const host=document.createElement('div');host.className='host';host.textContent=clean(item?.host,120)||'resultado';
    const title=document.createElement('div');title.className='title';title.textContent=clean(item?.title,160)||host.textContent;
    const snippet=document.createElement('div');snippet.className='snippet';snippet.textContent=clean(item?.snippet,360);
    link.append(host,title);if(snippet.textContent)link.append(snippet);resultsEl.append(link);
  }
}
window.renderHappySearch=render;
