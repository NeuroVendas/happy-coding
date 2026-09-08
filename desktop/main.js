'use strict';
const {app,BaseWindow,WebContentsView,session,ipcMain,dialog,shell}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const {HOME,safeTarget,cleanTitle,nextTabId}=require('./browser-core');
const {cleanFilename,isRiskyDownload,safePercent}=require('./download-core');
const {cleanUrl,cleanLibraryTitle,normalizeLibrary,addHistory,toggleBookmark}=require('./library-core');

const CHROME_COLLAPSED=104;
const CHROME_EXPANDED=360;
const MAX_TABS=20;
const MAX_DOWNLOADS=100;
let win,chromeView,activeTabId=null,tabCounter=0,chromeHeight=CHROME_COLLAPSED,downloadCounter=0,libraryPath='';
let library={bookmarks:[],history:[]};
const tabs=new Map();
const closedTabs=[];
const downloads=new Map();

function currentTab(){return activeTabId?tabs.get(activeTabId):null;}
function isChromeSender(sender){return sender===chromeView?.webContents;}
function tabForWebContents(webContents){for(const tab of tabs.values())if(tab.view.webContents===webContents)return tab;return null;}
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
function downloadState(record){
  return{
    id:record.id,
    filename:record.filename,
    url:record.url,
    mime:record.mime,
    state:record.state,
    received:record.received,
    total:record.total,
    percent:safePercent(record.received,record.total),
    paused:!!record.paused,
    canResume:!!record.canResume,
    risky:!!record.risky,
    automatic:!!record.automatic,
    completedAt:record.completedAt||null,
    saved:!!record.savePath
  };
}
function sendState(){
  if(!chromeView||chromeView.webContents.isDestroyed())return;
  chromeView.webContents.send('hc:browser-state',{activeTabId,tabs:[...tabs.values()].map(tabState)});
}
function sendDownloads(){
  if(!chromeView||chromeView.webContents.isDestroyed())return;
  chromeView.webContents.send('hc:downloads-state',[...downloads.values()].slice(-MAX_DOWNLOADS).reverse().map(downloadState));
}
function sendLibrary(){
  if(!chromeView||chromeView.webContents.isDestroyed())return;
  chromeView.webContents.send('hc:library-state',{bookmarks:library.bookmarks,history:library.history});
}
function notice(message){if(chromeView&&!chromeView.webContents.isDestroyed())chromeView.webContents.send('hc:notice',String(message||'').slice(0,200));}
function resize(){
  if(!win)return;
  const bounds=win.getContentBounds();
  chromeView?.setBounds({x:0,y:0,width:bounds.width,height:chromeHeight});
  for(const tab of tabs.values())tab.view.setBounds({x:0,y:chromeHeight,width:bounds.width,height:Math.max(0,bounds.height-chromeHeight)});
}
function setPanelOpen(open){chromeHeight=open?CHROME_EXPANDED:CHROME_COLLAPSED;resize();return true;}

function loadLibrary(){
  libraryPath=path.join(app.getPath('userData'),'browser-library.json');
  try{library=normalizeLibrary(JSON.parse(fs.readFileSync(libraryPath,'utf8')));}
  catch(error){
    library={bookmarks:[],history:[]};
    if(error?.code!=='ENOENT'){
      try{fs.renameSync(libraryPath,`${libraryPath}.corrupt-${Date.now()}`);}catch{}
    }
  }
}
function saveLibrary(){
  if(!libraryPath)return false;
  try{fs.mkdirSync(path.dirname(libraryPath),{recursive:true});fs.writeFileSync(libraryPath,JSON.stringify({version:1,bookmarks:library.bookmarks,history:library.history},null,2),{encoding:'utf8',mode:0o600});return true;}catch{notice('Não foi possível salvar histórico/favoritos.');return false;}
}
function recordHistory(tab,url){
  const safe=cleanUrl(url);if(!safe)return;
  library.history=addHistory(library.history,{id:`h-${randomUUID()}`,url:safe,title:cleanLibraryTitle(tab.title,safe),visitedAt:Date.now()});
  saveLibrary();sendLibrary();
}
function updateHistoryTitle(url,title){
  const safe=cleanUrl(url);if(!safe)return;
  const item=library.history.find(entry=>entry.url===safe);if(!item)return;
  const clean=cleanLibraryTitle(title,item.title);if(item.title===clean)return;
  item.title=clean;saveLibrary();sendLibrary();
}
function toggleCurrentBookmark(){
  const tab=currentTab();if(!tab)return false;
  const url=cleanUrl(tab.view.webContents.getURL()||tab.url);if(!url)return false;
  const result=toggleBookmark(library.bookmarks,{id:`b-${randomUUID()}`,url,title:cleanLibraryTitle(tab.title,url),createdAt:Date.now()});
  library.bookmarks=result.bookmarks;saveLibrary();sendLibrary();notice(result.added?'Adicionado aos favoritos.':'Removido dos favoritos.');return result.added;
}
function removeBookmark(id){
  const before=library.bookmarks.length;library.bookmarks=library.bookmarks.filter(item=>item.id!==String(id));if(library.bookmarks.length===before)return false;saveLibrary();sendLibrary();return true;
}
function clearHistory(){library.history=[];saveLibrary();sendLibrary();notice('Histórico limpo.');return true;}

function activateTab(id){
  const tab=tabs.get(id);if(!tab)return false;
  activeTabId=id;
  for(const item of tabs.values())item.view.setVisible(item.id===id);
  tab.view.webContents.focus();
  sendState();sendLibrary();return true;
}
function handleShortcut(tab,event,input){
  if(input.type!=='keyDown')return;
  const key=String(input.key||'').toLowerCase();
  const mod=process.platform==='darwin'?input.meta:input.control;
  if(mod&&input.shift&&key==='t'){event.preventDefault();restoreClosedTab();return;}
  if(mod&&key==='l'){event.preventDefault();chromeView.webContents.send('hc:focus-address');return;}
  if(mod&&key==='t'){event.preventDefault();createTab(HOME,true);return;}
  if(mod&&key==='w'){event.preventDefault();if(tab.id===activeTabId)closeTab(tab.id);return;}
  if(mod&&key==='tab'){event.preventDefault();cycleTabs(input.shift?-1:1);return;}
  if(mod&&key==='d'){event.preventDefault();toggleCurrentBookmark();return;}
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
  wc.on('did-navigate',(_event,url)=>{tab.url=url;tab.error='';recordHistory(tab,url);sendState();});
  wc.on('did-navigate-in-page',(_event,url)=>{tab.url=url;recordHistory(tab,url);sendState();});
  wc.on('page-title-updated',(_event,title)=>{tab.title=cleanTitle(title,tab.title);updateHistoryTitle(wc.getURL()||tab.url,tab.title);sendState();});
  wc.on('did-fail-load',(_event,errorCode,errorDescription,validatedURL,isMainFrame)=>{
    if(!isMainFrame||errorCode===-3)return;
    tab.loading=false;tab.error=cleanTitle(errorDescription,'Falha ao carregar');tab.url=validatedURL||tab.url;sendState();
  });
  wc.on('render-process-gone',(_event,details)=>{tab.loading=false;tab.error=`Página interrompida (${details.reason})`;sendState();});
}
function createTab(raw=HOME,activate=true){
  if(tabs.size>=MAX_TABS){notice(`Limite de ${MAX_TABS} abas nesta versão.`);return null;}
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
  if(activeTabId===id){const remaining=[...tabs.keys()];activateTab(remaining[Math.min(index,remaining.length-1)]);}else{sendState();sendLibrary();}
  return true;
}
function restoreClosedTab(){const url=closedTabs.shift();if(url)createTab(url,true);}
function cycleTabs(direction){const id=nextTabId([...tabs.keys()],activeTabId,direction);if(id)activateTab(id);}
function navigate(raw){const tab=currentTab();if(!tab)return false;wcLoad(tab,safeTarget(raw));sendState();return true;}
function goBack(){const tab=currentTab();if(!tab)return false;const nav=tab.view.webContents.navigationHistory;if(nav.canGoBack())nav.goBack();return true;}
function goForward(){const tab=currentTab();if(!tab)return false;const nav=tab.view.webContents.navigationHistory;if(nav.canGoForward())nav.goForward();return true;}
function reloadActive(){const tab=currentTab();if(!tab)return false;tab.view.webContents.reload();return true;}

function confirmDownload(filename,risky,automatic){
  if(!risky&&!automatic)return true;
  const reasons=[];
  if(risky)reasons.push('Este tipo de arquivo pode executar código ou alterar o computador.');
  if(automatic)reasons.push('O site iniciou este download sem um clique direto detectado.');
  const choice=dialog.showMessageBoxSync(win,{type:'warning',title:'Confirmar download',message:`Baixar “${filename}”?`,detail:`${reasons.join(' ')} Só continue se você confia no site e esperava este arquivo.`,buttons:['Cancelar','Continuar e escolher onde salvar'],defaultId:0,cancelId:0,noLink:true});
  return choice===1;
}
function registerDownload(event,item,webContents){
  const tab=tabForWebContents(webContents);
  if(!tab){event.preventDefault();return;}
  const filename=cleanFilename(item.getFilename());
  const risky=isRiskyDownload(filename);
  const automatic=!item.hasUserGesture();
  if(!confirmDownload(filename,risky,automatic)){event.preventDefault();notice('Download cancelado antes de iniciar.');return;}

  item.setSaveDialogOptions({title:'Salvar download — Happy Coding',buttonLabel:'Salvar',defaultPath:path.join(app.getPath('downloads'),filename)});
  const record={id:`download-${++downloadCounter}`,item,filename,url:String(item.getURL()||'').slice(0,4096),mime:String(item.getMimeType()||'').slice(0,120),state:'progressing',received:item.getReceivedBytes(),total:item.getTotalBytes(),paused:item.isPaused(),canResume:item.canResume(),risky,automatic,savePath:'',completedAt:null};
  downloads.set(record.id,record);
  while(downloads.size>MAX_DOWNLOADS){let removed=false;for(const [id,old] of downloads){if(old.state!=='progressing'){downloads.delete(id);removed=true;break;}}if(!removed)break;}
  sendDownloads();

  item.on('updated',(_event,state)=>{record.state=state;record.received=item.getReceivedBytes();record.total=item.getTotalBytes();record.paused=item.isPaused();record.canResume=item.canResume();sendDownloads();});
  item.once('done',(_event,state)=>{record.state=state;record.received=item.getReceivedBytes();record.total=item.getTotalBytes();record.paused=false;record.canResume=false;record.savePath=state==='completed'?String(item.getSavePath()||''):'';record.completedAt=Date.now();record.item=null;sendDownloads();if(state==='completed')notice(`${record.filename} baixado com sucesso.`);else if(state==='cancelled')notice(`${record.filename} cancelado.`);else notice(`${record.filename} foi interrompido.`);});
}
function withActiveDownload(id,action){const record=downloads.get(String(id));if(!record?.item||record.state!=='progressing')return false;try{return action(record.item,record)!==false;}catch{return false;}}
function pauseDownload(id){return withActiveDownload(id,(item,record)=>{item.pause();record.paused=true;sendDownloads();});}
function resumeDownload(id){return withActiveDownload(id,(item,record)=>{if(!item.canResume())return false;item.resume();record.paused=false;sendDownloads();});}
function cancelDownload(id){return withActiveDownload(id,item=>{item.cancel();});}
function revealDownload(id){const record=downloads.get(String(id));if(!record||record.state!=='completed'||!record.savePath)return false;shell.showItemInFolder(record.savePath);return true;}
function clearFinishedDownloads(){for(const [id,record] of downloads)if(record.state!=='progressing')downloads.delete(id);sendDownloads();return true;}

app.enableSandbox();
app.whenReady().then(()=>{
  loadLibrary();
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.on('will-download',registerDownload);
  win=new BaseWindow({width:1280,height:820,minWidth:760,minHeight:520,title:'Happy Coding =]'});
  chromeView=new WebContentsView({webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.contentView.addChildView(chromeView);
  chromeView.webContents.loadFile(path.join(__dirname,'chrome.html'));
  chromeView.webContents.on('did-finish-load',()=>{sendState();sendDownloads();sendLibrary();});
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
ipcMain.handle('hc:set-downloads-open',(event,open)=>isChromeSender(event.sender)&&setPanelOpen(!!open));
ipcMain.handle('hc:download-pause',(event,id)=>isChromeSender(event.sender)&&pauseDownload(id));
ipcMain.handle('hc:download-resume',(event,id)=>isChromeSender(event.sender)&&resumeDownload(id));
ipcMain.handle('hc:download-cancel',(event,id)=>isChromeSender(event.sender)&&cancelDownload(id));
ipcMain.handle('hc:download-reveal',(event,id)=>isChromeSender(event.sender)&&revealDownload(id));
ipcMain.handle('hc:downloads-clear',event=>isChromeSender(event.sender)&&clearFinishedDownloads());
ipcMain.handle('hc:bookmark-toggle',event=>isChromeSender(event.sender)&&toggleCurrentBookmark());
ipcMain.handle('hc:bookmark-remove',(event,id)=>isChromeSender(event.sender)&&removeBookmark(id));
ipcMain.handle('hc:history-clear',event=>isChromeSender(event.sender)&&clearHistory());
