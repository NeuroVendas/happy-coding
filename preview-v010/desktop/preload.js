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
function id(value){return String(value||'').slice(0,80);}
function libraryItem(item,timeKey){return{id:id(item?.id),url:String(item?.url||'').slice(0,4096),title:String(item?.title||'Sem título').slice(0,120),[timeKey]:Math.max(0,Number(item?.[timeKey])||0)};}

contextBridge.exposeInMainWorld('happyDesktop',Object.freeze({
  openWorkspaces:()=>ipcRenderer.invoke('hc:open-workspaces'),
  navigate:value=>ipcRenderer.invoke('hc:navigate',String(value).slice(0,4096)),
  back:()=>ipcRenderer.invoke('hc:back'),
  forward:()=>ipcRenderer.invoke('hc:forward'),
  reload:()=>ipcRenderer.invoke('hc:reload'),
  newTab:value=>ipcRenderer.invoke('hc:new-tab',String(value||'').slice(0,4096)),
  activateTab:value=>ipcRenderer.invoke('hc:activate-tab',id(value)),
  closeTab:value=>ipcRenderer.invoke('hc:close-tab',id(value)),
  cycleTab:direction=>ipcRenderer.invoke('hc:cycle-tab',Number(direction)<0?-1:1),
  restoreTab:()=>ipcRenderer.invoke('hc:restore-tab'),
  setDownloadsOpen:open=>ipcRenderer.invoke('hc:set-downloads-open',!!open),
  pauseDownload:value=>ipcRenderer.invoke('hc:download-pause',id(value)),
  resumeDownload:value=>ipcRenderer.invoke('hc:download-resume',id(value)),
  cancelDownload:value=>ipcRenderer.invoke('hc:download-cancel',id(value)),
  revealDownload:value=>ipcRenderer.invoke('hc:download-reveal',id(value)),
  clearFinishedDownloads:()=>ipcRenderer.invoke('hc:downloads-clear'),
  toggleBookmark:()=>ipcRenderer.invoke('hc:bookmark-toggle'),
  removeBookmark:value=>ipcRenderer.invoke('hc:bookmark-remove',id(value)),
  clearHistory:()=>ipcRenderer.invoke('hc:history-clear'),
  onBrowserState:listener('hc:browser-state',state=>({
    activeTabId:id(state?.activeTabId),
    tabs:Array.isArray(state?.tabs)?state.tabs.slice(0,20).map(tab=>({
      id:id(tab?.id),title:String(tab?.title||'Nova aba').slice(0,80),url:String(tab?.url||'').slice(0,4096),kind:tab?.kind==='search'?'search':'remote',searchQuery:String(tab?.searchQuery||'').slice(0,512),loading:!!tab?.loading,error:String(tab?.error||'').slice(0,160),canGoBack:!!tab?.canGoBack,canGoForward:!!tab?.canGoForward
    })):[]
  })),
  onDownloadsState:listener('hc:downloads-state',items=>Array.isArray(items)?items.slice(0,100).map(item=>({
    id:id(item?.id),filename:String(item?.filename||'download').slice(0,180),url:String(item?.url||'').slice(0,4096),mime:String(item?.mime||'').slice(0,120),state:String(item?.state||'').slice(0,32),received:Math.max(0,Number(item?.received)||0),total:Math.max(0,Number(item?.total)||0),percent:Math.max(0,Math.min(100,Number(item?.percent)||0)),paused:!!item?.paused,canResume:!!item?.canResume,risky:!!item?.risky,automatic:!!item?.automatic,saved:!!item?.saved,completedAt:Number(item?.completedAt)||null
  })):[]),
  onLibraryState:listener('hc:library-state',value=>({
    bookmarks:Array.isArray(value?.bookmarks)?value.bookmarks.slice(0,500).map(item=>libraryItem(item,'createdAt')):[],
    history:Array.isArray(value?.history)?value.history.slice(0,1000).map(item=>libraryItem(item,'visitedAt')):[]
  })),
  onFocusAddress:listener('hc:focus-address',()=>true),
  onOpenDownloads:listener('hc:open-downloads',()=>true),
  onOpenHistory:listener('hc:open-history',()=>true),
  onNotice:listener('hc:notice',value=>String(value||'').slice(0,200))
}));
