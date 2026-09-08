'use strict';
const {contextBridge,ipcRenderer}=require('electron');

function listener(channel,mapper){
  return handler=>{
    if(typeof handler!=='function')return()=>{};
    const wrapped=(_event,value)=>handler(mapper(value));
    ipcRenderer.on(channel,wrapped);
    return()=>ipcRenderer.removeListener(channel,wrapped);
  };
}

contextBridge.exposeInMainWorld('happyDesktop',Object.freeze({
  navigate:value=>ipcRenderer.invoke('hc:navigate',String(value).slice(0,4096)),
  back:()=>ipcRenderer.invoke('hc:back'),
  forward:()=>ipcRenderer.invoke('hc:forward'),
  reload:()=>ipcRenderer.invoke('hc:reload'),
  newTab:value=>ipcRenderer.invoke('hc:new-tab',String(value||'').slice(0,4096)),
  activateTab:id=>ipcRenderer.invoke('hc:activate-tab',String(id).slice(0,64)),
  closeTab:id=>ipcRenderer.invoke('hc:close-tab',String(id).slice(0,64)),
  cycleTab:direction=>ipcRenderer.invoke('hc:cycle-tab',Number(direction)<0?-1:1),
  restoreTab:()=>ipcRenderer.invoke('hc:restore-tab'),
  onBrowserState:listener('hc:browser-state',state=>({
    activeTabId:String(state?.activeTabId||''),
    tabs:Array.isArray(state?.tabs)?state.tabs.slice(0,20).map(tab=>({
      id:String(tab?.id||'').slice(0,64),title:String(tab?.title||'Nova aba').slice(0,80),url:String(tab?.url||'').slice(0,4096),loading:!!tab?.loading,error:String(tab?.error||'').slice(0,160),canGoBack:!!tab?.canGoBack,canGoForward:!!tab?.canGoForward
    })):[]
  })),
  onFocusAddress:listener('hc:focus-address',()=>true),
  onNotice:listener('hc:notice',value=>String(value||'').slice(0,200))
}));
