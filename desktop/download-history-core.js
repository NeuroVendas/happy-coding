'use strict';
const {cleanFilename,isRiskyDownload}=require('./download-core');
const MAX_HISTORY=100;
function safeHttpUrl(value){try{const u=new URL(String(value||''));return ['https:','http:'].includes(u.protocol)?u.href.slice(0,4096):'';}catch{return'';}}
function text(value,max){return String(value??'').replace(/[\r\n\t]+/g,' ').trim().slice(0,max);}
function cleanRecord(raw={}){const state=['completed','cancelled','interrupted'].includes(raw.state)?raw.state:'';if(!state)return null;const filename=cleanFilename(raw.filename),url=safeHttpUrl(raw.url),completedAt=Math.max(0,Number(raw.completedAt)||0);return{id:text(raw.id,80)||`history-${completedAt}`,filename,url,mime:text(raw.mime,120),state,received:Math.max(0,Number(raw.received)||0),total:Math.max(0,Number(raw.total)||0),risky:!!raw.risky||isRiskyDownload(filename),automatic:!!raw.automatic,savePath:text(raw.savePath,4096),completedAt};}
function normalizeHistory(raw){const out=[],seen=new Set();for(const item of Array.isArray(raw?.items)?raw.items:[]){const clean=cleanRecord(item);if(!clean||seen.has(clean.id))continue;seen.add(clean.id);out.push(clean);if(out.length>=MAX_HISTORY)break;}return{version:1,items:out};}
function historyRecord(record){const clean=cleanRecord({...record,state:record?.state||'completed'});if(!clean)return null;return clean;}
module.exports=Object.freeze({MAX_HISTORY,safeHttpUrl,cleanRecord,normalizeHistory,historyRecord});
