'use strict';

const MAX_RESTORE_TABS=10;

function cleanSessionUrl(value){
  try{const url=new URL(String(value||''));return url.protocol==='https:'?url.href:null;}catch{return null;}
}
function normalizeSession(value){
  if(value?.cleanExit!==true)return{restore:false,urls:[],activeIndex:0};
  const urls=[];
  for(const raw of Array.isArray(value?.tabs)?value.tabs:[]){const url=cleanSessionUrl(raw);if(url)urls.push(url);if(urls.length>=MAX_RESTORE_TABS)break;}
  if(!urls.length)return{restore:false,urls:[],activeIndex:0};
  const index=Math.max(0,Math.min(urls.length-1,Number.isInteger(value?.activeIndex)?value.activeIndex:0));
  return{restore:true,urls,activeIndex:index};
}
function buildSessionSnapshot(urls,activeIndex,cleanExit=false){
  const safe=[];
  for(const raw of Array.isArray(urls)?urls:[]){const url=cleanSessionUrl(raw);if(url)safe.push(url);if(safe.length>=MAX_RESTORE_TABS)break;}
  const index=safe.length?Math.max(0,Math.min(safe.length-1,Number.isInteger(activeIndex)?activeIndex:0)):0;
  return{version:1,tabs:safe,activeIndex:index,cleanExit:!!cleanExit,savedAt:Date.now()};
}

module.exports=Object.freeze({MAX_RESTORE_TABS,cleanSessionUrl,normalizeSession,buildSessionSnapshot});
