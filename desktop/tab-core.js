'use strict';
const ZOOM_STEPS=Object.freeze([0.5,0.67,0.8,0.9,1,1.1,1.25,1.5,1.75,2,2.5,3]);
function cleanFavicon(value){try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href.slice(0,4096):'';}catch{return'';}}
function pickFavicon(values){if(!Array.isArray(values))return'';for(const value of values){const clean=cleanFavicon(value);if(clean)return clean;}return'';}
function clampZoom(value){const n=Number(value);if(!Number.isFinite(n))return 1;return Math.max(0.5,Math.min(3,Math.round(n*100)/100));}
function stepZoom(value,direction){const current=clampZoom(value),step=direction<0?-1:1;let index=ZOOM_STEPS.findIndex(v=>v>=current-0.001);if(index<0)index=ZOOM_STEPS.length-1;if(step>0&&ZOOM_STEPS[index]<=current+0.001)index++;if(step<0&&ZOOM_STEPS[index]>=current-0.001)index--;return ZOOM_STEPS[Math.max(0,Math.min(ZOOM_STEPS.length-1,index))];}
function reorderIds(ids,movingId,targetId,pinnedById={}){const list=Array.isArray(ids)?ids.map(String):[],moving=String(movingId||''),target=String(targetId||'');if(moving===target||!list.includes(moving)||!list.includes(target))return list;if(!!pinnedById[moving]!==!!pinnedById[target])return list;const next=list.filter(id=>id!==moving),index=next.indexOf(target);next.splice(index,0,moving);return next;}
function pinnedFirst(ids,pinnedById={}){const list=Array.isArray(ids)?ids.map(String):[];return[...list.filter(id=>!!pinnedById[id]),...list.filter(id=>!pinnedById[id])];}
module.exports=Object.freeze({ZOOM_STEPS,cleanFavicon,pickFavicon,clampZoom,stepZoom,reorderIds,pinnedFirst});
