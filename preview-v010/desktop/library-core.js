'use strict';

const MAX_BOOKMARKS=500;
const MAX_HISTORY=1000;

function cleanUrl(value){
  try{const url=new URL(String(value||''));return url.protocol==='https:'?url.href:null;}catch{return null;}
}
function cleanLibraryTitle(value,fallback='Sem título'){
  const title=String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();
  return(title||fallback).slice(0,120);
}
function cleanId(value){return String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);}
function normalizeBookmark(value){
  const url=cleanUrl(value?.url);if(!url)return null;
  return{id:cleanId(value?.id)||`bookmark-${Date.now()}`,url,title:cleanLibraryTitle(value?.title,url),createdAt:Number(value?.createdAt)||Date.now()};
}
function normalizeHistoryEntry(value){
  const url=cleanUrl(value?.url);if(!url)return null;
  return{id:cleanId(value?.id)||`history-${Date.now()}`,url,title:cleanLibraryTitle(value?.title,url),visitedAt:Number(value?.visitedAt)||Date.now()};
}
function normalizeLibrary(value){
  const bookmarks=[],seen=new Set();
  for(const raw of Array.isArray(value?.bookmarks)?value.bookmarks:[]){const item=normalizeBookmark(raw);if(item&&!seen.has(item.url)){seen.add(item.url);bookmarks.push(item);}if(bookmarks.length>=MAX_BOOKMARKS)break;}
  const history=[];
  for(const raw of Array.isArray(value?.history)?value.history:[]){const item=normalizeHistoryEntry(raw);if(item)history.push(item);if(history.length>=MAX_HISTORY)break;}
  return{bookmarks,history};
}
function addHistory(history,entry){
  const item=normalizeHistoryEntry(entry);if(!item)return Array.isArray(history)?history:[];
  const list=Array.isArray(history)?history.slice():[];
  if(list[0]?.url===item.url){list[0]={...list[0],title:item.title,visitedAt:item.visitedAt};return list.slice(0,MAX_HISTORY);}
  list.unshift(item);return list.slice(0,MAX_HISTORY);
}
function toggleBookmark(bookmarks,entry){
  const item=normalizeBookmark(entry);const list=Array.isArray(bookmarks)?bookmarks.slice():[];if(!item)return{bookmarks:list,added:false};
  const index=list.findIndex(existing=>existing.url===item.url);
  if(index>=0){list.splice(index,1);return{bookmarks:list,added:false};}
  list.unshift(item);return{bookmarks:list.slice(0,MAX_BOOKMARKS),added:true};
}

module.exports=Object.freeze({MAX_BOOKMARKS,MAX_HISTORY,cleanUrl,cleanLibraryTitle,normalizeLibrary,addHistory,toggleBookmark});
