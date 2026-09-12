'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const allowed=new Set(['state','close','devtools','preview','page','select','sync','network','clearSession','reload','audit','inspect','clearEvents','capture','report','export','copy','open','saveProject','removeProject','health','api','record','stop','assert','replay','play','mark']);
contextBridge.exposeInMainWorld('happyDeveloper',Object.freeze({
  call:async(action,value={})=>{if(!allowed.has(action))throw Error('Ação inválida.');const r=await ipcRenderer.invoke('hc:developer',action,value);if(!r.ok)throw Error(r.error);return r.value;},
  onState:handler=>{const fn=(_event,state)=>handler(state);ipcRenderer.on('hc:dev-state',fn);return()=>ipcRenderer.removeListener('hc:dev-state',fn);}
}));
