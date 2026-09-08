'use strict';
const {app,BaseWindow,WebContentsView,session,ipcMain}=require('electron');
const path=require('node:path');
const {HOME,safeTarget,cleanTitle,nextTabId}=require('./browser-core');

const CHROME_HEIGHT=104;
const MAX_TABS=20;
let win,chromeView,activeTabId=null,tabCounter=0;
const tabs=new Map();
const closedTabs=[];

function currentTab(){return activeTabId?tabs.get(activeTabId):null;}
function isChromeSender(sender){return sender===chromeView?.webContents;}
function tabState(tab){
  const wc=tab.view.webContents;
  const nav=wc.navigationHistory;
  return{
    id:tab.id,
    title:cleanTitle(tab.title,tab.url===HOME?'Happy Coding =]':'Nova aba'),
    url:wc.getURL()||tab.url||HOME,
    loading:!!tab.loading,
    error:tab.error||'',
    canGoBack:nav.canGoBack(),
    canGoForward:nav.canGoForward()
  };
}
function sendState(){
  if(!chromeView||chromeView.webContents.isDestroyed())return;
  chromeView.webContents.send('hc:browser-state',{activeTabId,tabs:[...tabs.values()].map(tabState)});
}
function resize(){
  if(!win)return;
  const bounds=win.getContentBounds();
  chromeView?.setBounds({x:0,y:0,width:bounds.width,height:CHROME_HEIGHT});
  for(const tab of tabs.values())tab.view.setBounds({x:0,y:CHROME_HEIGHT,width:bounds.width,height:Math.max(0,bounds.height-CHROME_HEIGHT)});
}
function activateTab(id){
  const tab=tabs.get(id);if(!tab)return false;
  activeTabId=id;
  for(const item of tabs.values())item.view.setVisible(item.id===id);
  tab.view.webContents.focus();
  sendState();return true;
}
function handleShortcut(tab,event,input){
  if(input.type!=='keyDown')return;
  const key=String(input.key||'').toLowerCase();
  const mod=process.platform==='darwin'?input.meta:input.control;
  if(mod&&key==='l'){event.preventDefault();chromeView.webContents.send('hc:focus-address');return;}
  if(mod&&key==='t'){event.preventDefault();createTab(HOME,true);return;}
  if(mod&&key==='w'){event.preventDefault();if(tab.id===activeTabId)closeTab(tab.id);return;}
  if(mod&&key==='tab'){event.preventDefault();cycleTabs(input.shift?-1:1);return;}
  if(mod&&input.shift&&key==='t'){event.preventDefault();restoreClosedTab();return;}
  if(mod&&key==='r'){event.preventDefault();reloadActive();return;}
  if(input.alt&&key==='arrowleft'){event.preventDefault();goBack();return;}
  if(input.alt&&key==='arrowright'){event.preventDefault();goForward();}
}
function configureRemote(tab){
  const wc=tab.view.webContents;
  wc.setWindowOpenHandler(({url})=>{createTab(url,true);return{action:'deny'};});
  wc.on('will-navigate',(event,url)=>{
    const target=safeTarget(url);
    if(target!==url){event.preventDefault();wc.loadURL(target).catch(()=>{});}
  });
  wc.on('before-input-event',(event,input)=>handleShortcut(tab,event,input));
  wc.on('did-start-loading',()=>{tab.loading=true;tab.error='';sendState();});
  wc.on('did-stop-loading',()=>{tab.loading=false;tab.url=wc.getURL()||tab.url;sendState();});
  wc.on('did-navigate',(_event,url)=>{tab.url=url;tab.error='';sendState();});
  wc.on('did-navigate-in-page',(_event,url)=>{tab.url=url;sendState();});
  wc.on('page-title-updated',(_event,title)=>{tab.title=cleanTitle(title,tab.title);sendState();});
  wc.on('did-fail-load',(_event,errorCode,errorDescription,validatedURL,isMainFrame)=>{
    if(!isMainFrame||errorCode===-3)return;
    tab.loading=false;tab.error=cleanTitle(errorDescription,'Falha ao carregar');tab.url=validatedURL||tab.url;sendState();
  });
  wc.on('render-process-gone',(_event,details)=>{tab.loading=false;tab.error=`Página interrompida (${details.reason})`;sendState();});
}
function createTab(raw=HOME,activate=true){
  if(tabs.size>=MAX_TABS){chromeView?.webContents.send('hc:notice',`Limite de ${MAX_TABS} abas nesta versão.`);return null;}
  const id=`tab-${++tabCounter}`;
  const target=safeTarget(raw);
  const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,spellcheck:true}});
  const tab={id,view,url:target,title:target===HOME?'Happy Coding =]':'Nova aba',loading:true,error:''};
  tabs.set(id,tab);configureRemote(tab);
  win.contentView.addChildView(view);view.setVisible(false);resize();
  wcLoad(tab,target);
  if(activate)activateTab(id);else sendState();
  return id;
}
function wcLoad(tab,target){tab.url=target;tab.loading=true;tab.error='';tab.view.webContents.loadURL(target).catch(error=>{tab.loading=false;tab.error=cleanTitle(error?.message,'Falha ao carregar');sendState();});}
function closeTab(id){
  const tab=tabs.get(id);if(!tab)return false;
  const ids=[...tabs.keys()];const index=ids.indexOf(id);
  if(tab.url)closedTabs.unshift(tab.url);if(closedTabs.length>10)closedTabs.length=10;
  win.contentView.removeChildView(tab.view);tabs.delete(id);tab.view.webContents.close();
  if(!tabs.size){win.close();return true;}
  if(activeTabId===id){const remaining=[...tabs.keys()];activateTab(remaining[Math.min(index,remaining.length-1)]);}else sendState();
  return true;
}
function restoreClosedTab(){const url=closedTabs.shift();if(url)createTab(url,true);}
function cycleTabs(direction){const id=nextTabId([...tabs.keys()],activeTabId,direction);if(id)activateTab(id);}
function navigate(raw){const tab=currentTab();if(!tab)return false;wcLoad(tab,safeTarget(raw));sendState();return true;}
function goBack(){const tab=currentTab();if(!tab)return false;const nav=tab.view.webContents.navigationHistory;if(nav.canGoBack())nav.goBack();return true;}
function goForward(){const tab=currentTab();if(!tab)return false;const nav=tab.view.webContents.navigationHistory;if(nav.canGoForward())nav.goForward();return true;}
function reloadActive(){const tab=currentTab();if(!tab)return false;tab.view.webContents.reload();return true;}

app.enableSandbox();
app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  win=new BaseWindow({width:1280,height:820,minWidth:760,minHeight:520,title:'Happy Coding =]'});
  chromeView=new WebContentsView({webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.contentView.addChildView(chromeView);
  chromeView.webContents.loadFile(path.join(__dirname,'chrome.html'));
  chromeView.webContents.on('did-finish-load',sendState);
  createTab(HOME,true);resize();win.on('resize',resize);
  win.on('closed',()=>{for(const tab of tabs.values())if(!tab.view.webContents.isDestroyed())tab.view.webContents.close();tabs.clear();if(!chromeView?.webContents.isDestroyed())chromeView?.webContents.close();win=null;chromeView=null;activeTabId=null;});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

ipcMain.handle('hc:navigate',(event,value)=>isChromeSender(event.sender)&&navigate(value));
ipcMain.handle('hc:back',event=>isChromeSender(event.sender)&&goBack());
ipcMain.handle('hc:forward',event=>isChromeSender(event.sender)&&goForward());
ipcMain.handle('hc:reload',event=>isChromeSender(event.sender)&&reloadActive());
ipcMain.handle('hc:new-tab',(event,value)=>isChromeSender(event.sender)?createTab(value||HOME,true):null);
ipcMain.handle('hc:activate-tab',(event,id)=>isChromeSender(event.sender)&&activateTab(String(id)));
ipcMain.handle('hc:close-tab',(event,id)=>isChromeSender(event.sender)&&closeTab(String(id)));
ipcMain.handle('hc:cycle-tab',(event,direction)=>{if(!isChromeSender(event.sender))return false;cycleTabs(Number(direction)<0?-1:1);return true;});
ipcMain.handle('hc:restore-tab',event=>{if(!isChromeSender(event.sender))return false;restoreClosedTab();return true;});
