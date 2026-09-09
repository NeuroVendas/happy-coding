'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const allowed=new Set(['state','create','save','remove','chooseGodot','unlinkGodot','chooseProject','launch','tabs','openLinks','openRepository','connectGitHub','cancelGitHub','disconnectGitHub','githubBrowser','githubPermissions','repositories']);
contextBridge.exposeInMainWorld('happyWorkspace',Object.freeze({
  call:(action,values)=>allowed.has(action)?ipcRenderer.invoke('hc:workspace',action,values):Promise.resolve({ok:false,error:'Ação inválida.'}),
  onState:handler=>{if(typeof handler!=='function')return()=>{};const listener=(_event,value)=>handler(value);ipcRenderer.on('hc:workspace-state',listener);return()=>ipcRenderer.removeListener('hc:workspace-state',listener);}
}));
