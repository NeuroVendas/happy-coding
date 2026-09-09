'use strict';
const {app,BaseWindow,WebContentsView,session,ipcMain,dialog,shell}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const {HOME,resolveInput,safeTarget,cleanTitle,nextTabId}=require('./browser-core');
const {cleanFilename,isRiskyDownload,safePercent}=require('./download-core');
const {cleanUrl,cleanLibraryTitle,normalizeLibrary,addHistory,toggleBookmark}=require('./library-core');
const {normalizeSession,buildSessionSnapshot}=require('./session-core');
const {cleanSearchQuery,logicalSearchUrl,googleSearchUrl,normalizeGoogleResults,googleBlocked}=require('./search-core');
const {createWorkspaceService}=require('./workspace-service');
let workspaces=null;

const CHROME_COLLAPSED=104;
const CHROME_EXPANDED=360;
const MAX_TABS=20;
const MAX_DOWNLOADS=100;
const SEARCH_PARTITION='happy-coding-google-search';
const GOOGLE_EXTRACT=`(()=>{const out=[];const seen=new Set();for(const h of document.querySelectorAll('a h3')){const a=h.closest('a');if(!a||!a.href||seen.has(a.href))continue;seen.add(a.href);let box=a.closest('.MjjYud')||a.parentElement?.parentElement?.parentElement||a.parentElement;let text=String(box?.innerText||'');const title=String(h.innerText||'').trim();const lines=text.split('\\n').map(v=>v.trim()).filter(Boolean).filter(v=>v!==title&&v!==a.href);out.push({title,url:a.href,snippet:lines.slice(-4).join(' ')});if(out.length>=24)break;}return{results:out,href:location.href,bodyText:String(document.body?.innerText||'').slice(0,1600)};})()`;
let win,chromeView,activeTabId=null,tabCounter=0,chromeHeight=CHROME_COLLAPSED,downloadCounter=0,libraryPath='',sessionPath='',restoringSession=false,searchSession=null;
let library={bookmarks:[],history:[]};
const tabs=new Map();
const closedTabs=[];
const downloads=new Map();

function currentTab(){return activeTabId?tabs.get(activeTabId):null;}
function isChromeSender(sender){return sender===chromeView?.webContents;}
function tabForWebContents(webContents){for(const tab of tabs.values())if(tab.view.webContents===webContents)return tab;return null;}
function isSearchFile(url){try{return new URL(url).protocol==='file:'&&decodeURIComponent(new URL(url).pathname).replace(/\\/g,'/').endsWith('/search.html');}catch{return false;}}
function tabState(tab){
  const wc=tab.view.webContents;
  const nav=wc.navigationHistory;
  const url=tab.kind==='search'?(tab.searchUrl||tab.url||HOME):(wc.getURL()||tab.url||HOME);
  return{id:tab.id,title:cleanTitle(tab.title,tab.kind==='search'?'Pesquisa':'Nova aba'),url,kind:tab.kind||'remote',searchQuery:tab.kind==='search'?(tab.searchQuery||''):'',loading:!!tab.loading,error:tab.error||'',canGoBack:nav.canGoBack(),canGoForward:nav.canGoForward()};
}
function downloadState(record){return{id:record.id,filename:record.filename,url:record.url,mime:record.mime,state:record.state,received:record.received,total:record.total,percent:safePercent(record.received,record.total),paused:!!record.paused,canResume:!!record.canResume,risky:!!record.risky,automatic:!!record.automatic,completedAt:record.completedAt||null,saved:!!record.savePath};}
function sendState(){if(chromeView&&!chromeView.webContents.isDestroyed())chromeView.webContents.send('hc:browser-state',{activeTabId,tabs:[...tabs.values()].map(tabState)});}
function sendDownloads(){if(chromeView&&!chromeView.webContents.isDestroyed())chromeView.webContents.send('hc:downloads-state',[...downloads.values()].slice(-MAX_DOWNLOADS).reverse().map(downloadState));}
function sendLibrary(){if(chromeView&&!chromeView.webContents.isDestroyed())chromeView.webContents.send('hc:library-state',{bookmarks:library.bookmarks,history:library.history});}
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
  catch(error){library={bookmarks:[],history:[]};if(error?.code!=='ENOENT'){try{fs.renameSync(libraryPath,`${libraryPath}.corrupt-${Date.now()}`);}catch{}}}
}
function saveLibrary(){
  if(!libraryPath)return false;
  try{fs.mkdirSync(path.dirname(libraryPath),{recursive:true});fs.writeFileSync(libraryPath,JSON.stringify({version:1,bookmarks:library.bookmarks,history:library.history},null,2),{encoding:'utf8',mode:0o600});return true;}catch{notice('Não foi possível salvar histórico/favoritos.');return false;}
}
function recordHistory(tab,url){const safe=cleanUrl(url);if(!safe)return;library.history=addHistory(library.history,{id:`h-${randomUUID()}`,url:safe,title:cleanLibraryTitle(tab.title,safe),visitedAt:Date.now()});saveLibrary();sendLibrary();}
function updateHistoryTitle(url,title){const safe=cleanUrl(url);if(!safe)return;const item=library.history.find(entry=>entry.url===safe);if(!item)return;const clean=cleanLibraryTitle(title,item.title);if(item.title===clean)return;item.title=clean;saveLibrary();sendLibrary();}
function toggleCurrentBookmark(){
  const tab=currentTab();if(!tab||tab.kind==='search')return false;
  const url=cleanUrl(tab.view.webContents.getURL()||tab.url);if(!url)return false;
  const result=toggleBookmark(library.bookmarks,{id:`b-${randomUUID()}`,url,title:cleanLibraryTitle(tab.title,url),createdAt:Date.now()});
  library.bookmarks=result.bookmarks;saveLibrary();sendLibrary();notice(result.added?'Adicionado aos favoritos.':'Removido dos favoritos.');return result.added;
}
function removeBookmark(id){const before=library.bookmarks.length;library.bookmarks=library.bookmarks.filter(item=>item.id!==String(id));if(library.bookmarks.length===before)return false;saveLibrary();sendLibrary();return true;}
function clearHistory(){library.history=[];saveLibrary();sendLibrary();notice('Histórico limpo.');return true;}

function writeSession(snapshot){
  if(!sessionPath)return false;
  try{fs.mkdirSync(path.dirname(sessionPath),{recursive:true});fs.writeFileSync(sessionPath,JSON.stringify(snapshot,null,2),{encoding:'utf8',mode:0o600});return true;}catch{notice('Não foi possível salvar a sessão de abas.');return false;}
}
function loadSessionPlan(){
  sessionPath=path.join(app.getPath('userData'),'browser-session.json');
  try{return normalizeSession(JSON.parse(fs.readFileSync(sessionPath,'utf8')));}
  catch(error){if(error?.code!=='ENOENT'){try{fs.renameSync(sessionPath,`${sessionPath}.corrupt-${Date.now()}`);}catch{}}return{restore:false,urls:[],activeIndex:0};}
}
function sessionEntries(){
  const entries=[];
  for(const tab of tabs.values()){
    if(tab.kind==='search')continue;
    const url=cleanUrl(tab.view.webContents.getURL()||tab.url);
    if(url)entries.push({id:tab.id,url});
  }
  return entries;
}
function saveSession(cleanExit=false){
  if(restoringSession||!sessionPath)return false;
  const entries=sessionEntries();
  const index=Math.max(0,entries.findIndex(entry=>entry.id===activeTabId));
  return writeSession(buildSessionSnapshot(entries.map(entry=>entry.url),index,cleanExit));
}
function markSessionRunning(plan){return writeSession(buildSessionSnapshot(plan.urls,plan.activeIndex,false));}

function activateTab(id){
  const tab=tabs.get(id);if(!tab)return false;
  activeTabId=id;
  for(const item of tabs.values())item.view.setVisible(item.id===id);
  tab.view.webContents.focus();sendState();sendLibrary();if(!restoringSession)saveSession(false);return true;
}
function handleShortcut(tab,event,input){
  if(input.type!=='keyDown')return;
  const key=String(input.key||'').toLowerCase();const mod=process.platform==='darwin'?input.meta:input.control;
  if(mod&&input.shift&&key==='t'){event.preventDefault();restoreClosedTab();return;}
  if(mod&&key==='l'){event.preventDefault();chromeView.webContents.send('hc:focus-address');return;}
  if(mod&&key==='t'){event.preventDefault();createTab(HOME,true);return;}
  if(mod&&key==='w'){event.preventDefault();if(tab.id===activeTabId)closeTab(tab.id);return;}
  if(mod&&key==='tab'){event.preventDefault();cycleTabs(input.shift?-1:1);return;}
  if(mod&&key==='d'){event.preventDefault();toggleCurrentBookmark();return;}
  if(mod&&key==='j'){event.preventDefault();chromeView.webContents.send('hc:open-downloads');return;}
  if(mod&&key==='h'){event.preventDefault();chromeView.webContents.send('hc:open-history');return;}
  if(mod&&key==='r'){event.preventDefault();reloadActive();return;}
  if(input.alt&&key==='arrowleft'){event.preventDefault();goBack();return;}
  if(input.alt&&key==='arrowright'){event.preventDefault();goForward();}
}
function configureTab(tab){
  const wc=tab.view.webContents;
  wc.setWindowOpenHandler(({url})=>{createTab(url,true);return{action:'deny'};});
  wc.on('will-navigate',(event,url)=>{
    if(tab.kind==='search'&&isSearchFile(url))return;
    const target=resolveInput(url);
    if(target.kind==='search'){event.preventDefault();showSearch(tab,target.query);return;}
    if(target.url!==url){event.preventDefault();tab.kind='remote';wc.loadURL(target.url).catch(()=>{});return;}
    if(tab.kind==='search'){tab.kind='remote';tab.url=url;tab.title='Nova aba';sendState();}
  });
  wc.on('before-input-event',(event,input)=>handleShortcut(tab,event,input));
  wc.on('did-start-loading',()=>{tab.loading=true;tab.error='';sendState();});
  wc.on('did-stop-loading',()=>{tab.loading=false;if(tab.kind!=='search')tab.url=wc.getURL()||tab.url;sendState();});
  wc.on('did-navigate',(_event,url)=>{
    if(isSearchFile(url)){tab.kind='search';tab.url=tab.searchUrl||tab.url;tab.title=cleanTitle(tab.searchQuery||'Pesquisa');tab.error='';sendState();return;}
    tab.kind='remote';tab.url=url;tab.error='';recordHistory(tab,url);sendState();if(!restoringSession)saveSession(false);
  });
  wc.on('did-navigate-in-page',(_event,url)=>{if(tab.kind==='search')return;tab.url=url;recordHistory(tab,url);sendState();if(!restoringSession)saveSession(false);});
  wc.on('page-title-updated',(_event,title)=>{if(tab.kind==='search')return;tab.title=cleanTitle(title,tab.title);updateHistoryTitle(wc.getURL()||tab.url,tab.title);sendState();});
  wc.on('did-fail-load',(_event,errorCode,errorDescription,validatedURL,isMainFrame)=>{if(!isMainFrame||errorCode===-3)return;tab.loading=false;tab.error=cleanTitle(errorDescription,'Falha ao carregar');if(tab.kind!=='search')tab.url=validatedURL||tab.url;sendState();});
  wc.on('render-process-gone',(_event,details)=>{tab.loading=false;tab.error=`Página interrompida (${details.reason})`;sendState();});
}

function googleUserAgent(){const platform=process.platform==='win32'?'Windows NT 10.0; Win64; x64':process.platform==='darwin'?'Macintosh; Intel Mac OS X 10_15_7':'X11; Linux x86_64';return`Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;}
function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms));}
async function collectGoogleResults(query){
  const view=new WebContentsView({webPreferences:{partition:SEARCH_PARTITION,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,spellcheck:false}});
  const wc=view.webContents;wc.setWindowOpenHandler(()=>({action:'deny'}));wc.setUserAgent(googleUserAgent());
  try{
    await Promise.race([wc.loadURL(googleSearchUrl(query)),timeout(15000)]);
    const raw=await Promise.race([wc.executeJavaScript(GOOGLE_EXTRACT,false),timeout(6000)]);
    const results=normalizeGoogleResults(raw?.results);
    if(googleBlocked(raw))return{query,results:[],error:'O Google pediu uma verificação/consentimento e não liberou resultados para a busca interna. Tente novamente mais tarde.'};
    if(!results.length)return{query,results:[],error:'O Google não retornou resultados utilizáveis para esta pesquisa agora.'};
    return{query,results,error:''};
  }catch{return{query,results:[],error:'Não foi possível consultar o Google agora. Verifique a conexão e tente novamente.'};}
  finally{if(!wc.isDestroyed())wc.close();}
}
async function renderSearchPayload(tab,payload,token){
  if(!tabs.has(tab.id)||tab.searchToken!==token||tab.view.webContents.isDestroyed())return;
  const encoded=Buffer.from(JSON.stringify(payload),'utf8').toString('base64');
  const script=`window.renderHappySearch(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('${encoded}'),c=>c.charCodeAt(0)))))`;
  try{await tab.view.webContents.executeJavaScript(script,false);}catch{}
  if(tab.searchToken===token){tab.loading=false;tab.error='';sendState();}
}
function showSearch(tab,rawQuery){
  const query=cleanSearchQuery(rawQuery);if(!query){wcLoad(tab,HOME);return false;}
  const token=(tab.searchToken||0)+1;tab.searchToken=token;tab.kind='search';tab.searchQuery=query;tab.searchUrl=logicalSearchUrl(query);tab.url=tab.searchUrl;tab.title=cleanTitle(query,'Pesquisa');tab.loading=true;tab.error='';sendState();
  tab.view.webContents.loadFile(path.join(__dirname,'search.html')).then(async()=>{if(tab.searchToken!==token)return;const payload=await collectGoogleResults(query);await renderSearchPayload(tab,payload,token);}).catch(error=>{if(tab.searchToken!==token)return;tab.loading=false;tab.error=cleanTitle(error?.message,'Falha na pesquisa');sendState();});
  return true;
}
function createTab(raw=HOME,activate=true){
  if(tabs.size>=MAX_TABS){notice(`Limite de ${MAX_TABS} abas nesta versão.`);return null;}
  const id=`tab-${++tabCounter}`,intent=resolveInput(raw);
  const target=intent.kind==='url'?intent.url:HOME;
  const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,spellcheck:true}});
  const tab={id,view,url:target,title:target===HOME?'Happy Coding =]':'Nova aba',kind:'remote',searchQuery:'',searchUrl:'',searchToken:0,loading:true,error:''};
  tabs.set(id,tab);configureTab(tab);win.contentView.addChildView(view);view.setVisible(false);resize();
  if(intent.kind==='search')showSearch(tab,intent.query);else wcLoad(tab,target);
  if(activate)activateTab(id);else{sendState();if(!restoringSession)saveSession(false);}return id;
}
function wcLoad(tab,target){tab.searchToken=(tab.searchToken||0)+1;tab.kind='remote';tab.url=target;tab.loading=true;tab.error='';tab.view.webContents.loadURL(target).catch(error=>{tab.loading=false;tab.error=cleanTitle(error?.message,'Falha ao carregar');sendState();});}
function closeTab(id){
  const tab=tabs.get(id);if(!tab)return false;
  const ids=[...tabs.keys()],index=ids.indexOf(id);if(tab.url)closedTabs.unshift(tab.url);if(closedTabs.length>10)closedTabs.length=10;
  win.contentView.removeChildView(tab.view);tabs.delete(id);tab.view.webContents.close();
  if(!tabs.size){win.close();return true;}
  if(activeTabId===id){const remaining=[...tabs.keys()];activateTab(remaining[Math.min(index,remaining.length-1)]);}else{sendState();sendLibrary();if(!restoringSession)saveSession(false);}return true;
}
function restoreClosedTab(){const url=closedTabs.shift();if(url)createTab(url,true);}
function cycleTabs(direction){const id=nextTabId([...tabs.keys()],activeTabId,direction);if(id)activateTab(id);}
function navigate(raw){const tab=currentTab();if(!tab)return false;const intent=resolveInput(raw);if(intent.kind==='search')return showSearch(tab,intent.query);wcLoad(tab,intent.url);sendState();return true;}
function goBack(){const tab=currentTab();if(!tab)return false;const nav=tab.view.webContents.navigationHistory;if(nav.canGoBack())nav.goBack();return true;}
function goForward(){const tab=currentTab();if(!tab)return false;const nav=tab.view.webContents.navigationHistory;if(nav.canGoForward())nav.goForward();return true;}
function reloadActive(){const tab=currentTab();if(!tab)return false;if(tab.kind==='search')return showSearch(tab,tab.searchQuery);tab.view.webContents.reload();return true;}

function confirmDownload(filename,risky,automatic){
  if(!risky&&!automatic)return true;const reasons=[];
  if(risky)reasons.push('Este tipo de arquivo pode executar código ou alterar o computador.');
  if(automatic)reasons.push('O site iniciou este download sem um clique direto detectado.');
  return dialog.showMessageBoxSync(win,{type:'warning',title:'Confirmar download',message:`Baixar “${filename}”?`,detail:`${reasons.join(' ')} Só continue se você confia no site e esperava este arquivo.`,buttons:['Cancelar','Continuar e escolher onde salvar'],defaultId:0,cancelId:0,noLink:true})===1;
}
function registerDownload(event,item,webContents){
  const tab=tabForWebContents(webContents);if(!tab){event.preventDefault();return;}
  const filename=cleanFilename(item.getFilename()),risky=isRiskyDownload(filename),automatic=!item.hasUserGesture();
  if(!confirmDownload(filename,risky,automatic)){event.preventDefault();notice('Download cancelado antes de iniciar.');return;}
  item.setSaveDialogOptions({title:'Salvar download — Happy Coding',buttonLabel:'Salvar',defaultPath:path.join(app.getPath('downloads'),filename)});
  const record={id:`download-${++downloadCounter}`,item,filename,url:String(item.getURL()||'').slice(0,4096),mime:String(item.getMimeType()||'').slice(0,120),state:'progressing',received:item.getReceivedBytes(),total:item.getTotalBytes(),paused:item.isPaused(),canResume:item.canResume(),risky,automatic,savePath:'',completedAt:null};
  downloads.set(record.id,record);
  while(downloads.size>MAX_DOWNLOADS){let removed=false;for(const [id,old] of downloads){if(old.state!=='progressing'){downloads.delete(id);removed=true;break;}}if(!removed)break;}sendDownloads();
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
  loadLibrary();const plan=loadSessionPlan();markSessionRunning(plan);
  searchSession=session.fromPartition(SEARCH_PARTITION);searchSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));searchSession.setPermissionCheckHandler(()=>false);searchSession.on('will-download',event=>event.preventDefault());
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));session.defaultSession.setPermissionCheckHandler(()=>false);session.defaultSession.on('will-download',registerDownload);
  win=new BaseWindow({width:1280,height:820,minWidth:760,minHeight:520,title:'Happy Coding =]'});
  workspaces=createWorkspaceService({userData:app.getPath('userData'),getTabs:()=>sessionEntries().map(item=>({...item,title:tabs.get(item.id)?.title||item.url})),openUrl:url=>{if(!win)throw new Error('Reabra o navegador para abrir os links do espaço.');win.show();win.focus();return createTab(url,true);}});
  chromeView=new WebContentsView({webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.contentView.addChildView(chromeView);chromeView.webContents.loadFile(path.join(__dirname,'chrome.html'));chromeView.webContents.on('did-finish-load',()=>{sendState();sendDownloads();sendLibrary();});
  restoringSession=true;
  if(plan.restore){for(const url of plan.urls)createTab(url,false);const ids=[...tabs.keys()];activateTab(ids[Math.min(plan.activeIndex,ids.length-1)]||ids[0]);}
  else createTab(HOME,true);
  restoringSession=false;saveSession(false);resize();win.on('resize',resize);
  win.on('close',()=>{restoringSession=false;saveSession(true);});
  win.on('closed',()=>{workspaces?.close();for(const tab of tabs.values())if(!tab.view.webContents.isDestroyed())tab.view.webContents.close();tabs.clear();if(!chromeView?.webContents.isDestroyed())chromeView.webContents.close();win=null;chromeView=null;activeTabId=null;});
});
app.on('before-quit',()=>{workspaces?.close();if(win)saveSession(true);});
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
ipcMain.handle('hc:open-workspaces',event=>isChromeSender(event.sender)&&event.senderFrame===chromeView.webContents.mainFrame&&workspaces?.open());
