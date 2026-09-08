'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('happyDesktop',Object.freeze({
  navigate:value=>ipcRenderer.invoke('hc:navigate',String(value).slice(0,2048)),
  back:()=>ipcRenderer.invoke('hc:back'),
  forward:()=>ipcRenderer.invoke('hc:forward'),
  reload:()=>ipcRenderer.invoke('hc:reload'),
  onNavigationState:handler=>{
    if(typeof handler!=='function')return()=>{};
    const wrapped=(_event,state)=>handler({url:String(state?.url||'').slice(0,2048)});
    ipcRenderer.on('hc:navigation-state',wrapped);
    return()=>ipcRenderer.removeListener('hc:navigation-state',wrapped);
  }
}));