'use strict';

const RISKY_EXTENSIONS=new Set([
  '.exe','.msi','.msp','.msix','.appx','.appxbundle','.bat','.cmd','.com','.scr','.cpl',
  '.ps1','.psm1','.vbs','.vbe','.js','.jse','.wsf','.wsh','.hta','.reg','.lnk','.jar','.iso'
]);

function cleanFilename(value){
  const name=String(value??'download').replace(/[\r\n\t]/g,' ').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').trim();
  return (name||'download').slice(0,180);
}
function extensionOf(filename){
  const name=cleanFilename(filename).toLowerCase();
  const index=name.lastIndexOf('.');
  return index>0?name.slice(index):'';
}
function isRiskyDownload(filename){return RISKY_EXTENSIONS.has(extensionOf(filename));}
function safePercent(received,total){
  const r=Math.max(0,Number(received)||0),t=Math.max(0,Number(total)||0);
  if(!t)return 0;
  return Math.max(0,Math.min(100,Math.round((r/t)*100)));
}
function displayBytes(value){
  let n=Math.max(0,Number(value)||0);const units=['B','KB','MB','GB','TB'];let i=0;
  while(n>=1024&&i<units.length-1){n/=1024;i++;}
  return `${n>=10||i===0?n.toFixed(0):n.toFixed(1)} ${units[i]}`;
}

module.exports=Object.freeze({RISKY_EXTENSIONS,cleanFilename,extensionOf,isRiskyDownload,safePercent,displayBytes});
