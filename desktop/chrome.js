'use strict';
const address=document.getElementById('address');
const tabsRoot=document.getElementById('tabs');
const back=document.getElementById('back');
const forward=document.getElementById('forward');
const reload=document.getElementById('reload');
const status=document.getElementById('status');
const downloadsBtn=document.getElementById('downloadsBtn');
const downloadPanel=document.getElementById('downloadPanel');
const downloadsList=document.getElementById('downloadsList');
const downloadBadge=document.getElementById('downloadBadge');
const bookmarkBtn=document.getElementById('bookmarkBtn');
const libraryBtn=document.getElementById('libraryBtn');
const libraryPanel=document.getElementById('libraryPanel');
const libraryList=document.getElementById('libraryList');
const favoritesTab=document.getElementById('favoritesTab');
const historyTab=document.getElementById('historyTab');
const clearHistory=document.getElementById('clearHistory');
const HOME='https://neurovendas.github.io/happy-coding/';
let state={activeTabId:'',tabs:[]},downloads=[],library={bookmarks:[],history:[]},activePanel=null,libraryMode='favorites';

function activeTab(){return state.tabs.find(tab=>tab.id===state.activeTabId)||null;}
function displayUrl(tab){if(!tab)return'happy://home';if(tab.kind==='search')return tab.searchQuery||'';return tab.url===HOME?'happy://home':tab.url;}
function formatBytes(value){let n=Math.max(0,Number(value)||0),i=0;const units=['B','KB','MB','GB','TB'];while(n>=1024&&i<units.length-1){n/=1024;i++;}return`${n>=10||i===0?n.toFixed(0):n.toFixed(1)} ${units[i]}`;}
function originLabel(url){try{return new URL(url).hostname||url;}catch{return url||'origem desconhecida';}}
function formatWhen(value){if(!value)return'';try{return new Date(value).toLocaleString('pt-BR');}catch{return'';}}
function stateLabel(item){if(item.state==='completed')return'Concluído';if(item.state==='cancelled')return'Cancelado';if(item.state==='interrupted')return'Interrompido';if(item.paused)return'Pausado';return item.total?`${item.percent}%`:'Baixando…';}
function currentBookmarked(){const tab=activeTab();if(!tab||tab.kind==='search')return false;return library.bookmarks.some(item=>item.url===tab.url);}
function renderBookmarkState(){const tab=activeTab();const saved=currentBookmarked();bookmarkBtn.disabled=!tab||tab.kind==='search';bookmarkBtn.classList.toggle('saved',saved);bookmarkBtn.textContent=saved?'★':'☆';bookmarkBtn.title=tab?.kind==='search'?'Resultados de pesquisa não são favoritados':saved?'Remover dos favoritos (Ctrl+D)':'Adicionar aos favoritos (Ctrl+D)';}
function renderTabs(){
  tabsRoot.replaceChildren();
  for(const tab of state.tabs){
    const item=document.createElement('div');item.className=`tab${tab.id===state.activeTabId?' active':''}`;
    const main=document.createElement('button');main.type='button';main.className='tab-main';main.title=tab.title;
    if(tab.loading){const dot=document.createElement('span');dot.className='loading';dot.setAttribute('aria-label','Carregando');main.append(dot);}
    const title=document.createElement('span');title.className='tab-title';title.textContent=tab.title||'Nova aba';main.append(title);
    main.addEventListener('click',()=>window.happyDesktop.activateTab(tab.id));
    const close=document.createElement('button');close.type='button';close.className='tab-close';close.textContent='×';close.title='Fechar aba';close.setAttribute('aria-label',`Fechar ${tab.title||'aba'}`);close.addEventListener('click',()=>window.happyDesktop.closeTab(tab.id));
    item.append(main,close);tabsRoot.append(item);
  }
}
function render(next){
  state=next;renderTabs();renderBookmarkState();
  const tab=activeTab();
  back.disabled=!tab?.canGoBack;forward.disabled=!tab?.canGoForward;
  if(document.activeElement!==address)address.value=displayUrl(tab);
  status.textContent=tab?.error||((tab?.loading)?(tab?.kind==='search'?'Buscando no Google…':'Carregando…'):(tab?.kind==='search'?'Google · SafeSearch':'HTTPS + SafeSearch'));status.title=status.textContent;
}
function actionButton(text,handler,cls=''){const button=document.createElement('button');button.type='button';button.textContent=text;if(cls)button.className=cls;button.addEventListener('click',handler);return button;}
function renderDownloads(next=downloads){
  downloads=next;const active=downloads.filter(item=>item.state==='progressing').length;
  downloadBadge.textContent=String(Math.min(active,99));downloadBadge.classList.toggle('hidden',active===0);downloadsList.replaceChildren();
  if(!downloads.length){const empty=document.createElement('p');empty.className='empty-downloads';empty.textContent='Nenhum download nesta sessão.';downloadsList.append(empty);return;}
  for(const item of downloads){
    const row=document.createElement('article');row.className='download-row';const info=document.createElement('div');
    const name=document.createElement('div');name.className=`download-name${item.risky?' risky':''}`;name.textContent=item.filename;
    if(item.risky||item.automatic){const tag=document.createElement('span');tag.className='risk-tag';tag.textContent=item.risky?'ARQUIVO SENSÍVEL':'AUTOMÁTICO';name.append(tag);}
    const sub=document.createElement('div');sub.className='download-sub';sub.textContent=`${originLabel(item.url)} · ${formatBytes(item.received)}${item.total?` / ${formatBytes(item.total)}`:''}`;
    const progress=document.createElement('div');progress.className='download-progress';const fill=document.createElement('span');fill.style.width=`${item.state==='completed'?100:item.percent}%`;progress.append(fill);
    const stateLine=document.createElement('div');stateLine.className='download-state';stateLine.textContent=stateLabel(item);info.append(name,sub,progress,stateLine);
    const actions=document.createElement('div');actions.className='download-actions';
    if(item.state==='progressing'){if(item.paused&&item.canResume)actions.append(actionButton('Retomar',()=>window.happyDesktop.resumeDownload(item.id)));else if(!item.paused&&item.canResume)actions.append(actionButton('Pausar',()=>window.happyDesktop.pauseDownload(item.id)));actions.append(actionButton('Cancelar',()=>window.happyDesktop.cancelDownload(item.id),'cancel'));}
    else if(item.state==='completed'&&item.saved)actions.append(actionButton('Mostrar na pasta',()=>window.happyDesktop.revealDownload(item.id)));
    row.append(info,actions);downloadsList.append(row);
  }
}
function renderLibrary(next=library){library=next;renderBookmarkState();renderLibraryList();}
function renderLibraryList(){
  libraryList.replaceChildren();favoritesTab.classList.toggle('active',libraryMode==='favorites');historyTab.classList.toggle('active',libraryMode==='history');clearHistory.classList.toggle('hidden',libraryMode!=='history');
  const items=libraryMode==='favorites'?library.bookmarks:library.history;
  if(!items.length){const empty=document.createElement('p');empty.className='empty-library';empty.textContent=libraryMode==='favorites'?'Nenhum favorito salvo neste computador.':'Nenhum histórico salvo neste computador.';libraryList.append(empty);return;}
  for(const item of items){
    const row=document.createElement('article');row.className='library-row';const info=document.createElement('div');
    const title=document.createElement('div');title.className='library-title';title.textContent=item.title||originLabel(item.url);
    const sub=document.createElement('div');sub.className='library-sub';sub.textContent=`${originLabel(item.url)} · ${formatWhen(libraryMode==='favorites'?item.createdAt:item.visitedAt)}`;info.append(title,sub);
    const actions=document.createElement('div');actions.className='library-actions';actions.append(actionButton('Abrir',async()=>{await window.happyDesktop.navigate(item.url);await setPanel(null);}));
    if(libraryMode==='favorites')actions.append(actionButton('Remover',()=>window.happyDesktop.removeBookmark(item.id),'remove'));
    row.append(info,actions);libraryList.append(row);
  }
}
async function setPanel(name){
  activePanel=name||null;downloadPanel.classList.toggle('hidden',activePanel!=='downloads');libraryPanel.classList.toggle('hidden',activePanel!=='library');downloadsBtn.classList.toggle('active',activePanel==='downloads');libraryBtn.classList.toggle('active',activePanel==='library');await window.happyDesktop.setDownloadsOpen(!!activePanel);
}

document.getElementById('go').addEventListener('submit',async event=>{event.preventDefault();await window.happyDesktop.navigate(address.value);address.blur();});
back.addEventListener('click',()=>window.happyDesktop.back());forward.addEventListener('click',()=>window.happyDesktop.forward());reload.addEventListener('click',()=>window.happyDesktop.reload());
document.getElementById('newTab').addEventListener('click',()=>window.happyDesktop.newTab('happy://home'));
bookmarkBtn.addEventListener('click',()=>window.happyDesktop.toggleBookmark());downloadsBtn.addEventListener('click',()=>setPanel(activePanel==='downloads'?null:'downloads'));libraryBtn.addEventListener('click',()=>setPanel(activePanel==='library'?null:'library'));
document.getElementById('clearDownloads').addEventListener('click',()=>window.happyDesktop.clearFinishedDownloads());
favoritesTab.addEventListener('click',()=>{libraryMode='favorites';renderLibraryList();});historyTab.addEventListener('click',()=>{libraryMode='history';renderLibraryList();});clearHistory.addEventListener('click',()=>{if(confirm('Limpar todo o histórico local deste navegador?'))window.happyDesktop.clearHistory();});
window.happyDesktop.onBrowserState(render);window.happyDesktop.onDownloadsState(renderDownloads);window.happyDesktop.onLibraryState(renderLibrary);window.happyDesktop.onFocusAddress(()=>{address.focus();address.select();});window.happyDesktop.onOpenDownloads(()=>setPanel('downloads'));window.happyDesktop.onOpenHistory(()=>{libraryMode='history';renderLibraryList();setPanel('library');});window.happyDesktop.onNotice(message=>{status.textContent=message;status.title=message;});

document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();const mod=navigator.platform.toLowerCase().includes('mac')?event.metaKey:event.ctrlKey;
  if(event.key==='Escape'&&activePanel){event.preventDefault();setPanel(null);return;}
  if(mod&&key==='j'){event.preventDefault();setPanel(activePanel==='downloads'?null:'downloads');return;}
  if(mod&&key==='h'){event.preventDefault();libraryMode='history';renderLibraryList();setPanel('library');return;}
  if(mod&&key==='d'){event.preventDefault();window.happyDesktop.toggleBookmark();return;}
  if(mod&&event.shiftKey&&key==='t'){event.preventDefault();window.happyDesktop.restoreTab();return;}
  if(mod&&key==='l'){event.preventDefault();address.focus();address.select();return;}
  if(mod&&key==='t'){event.preventDefault();window.happyDesktop.newTab('happy://home');return;}
  if(mod&&key==='w'){event.preventDefault();if(state.activeTabId)window.happyDesktop.closeTab(state.activeTabId);return;}
  if(mod&&key==='tab'){event.preventDefault();window.happyDesktop.cycleTab(event.shiftKey?-1:1);return;}
  if(mod&&key==='r'){event.preventDefault();window.happyDesktop.reload();return;}
  if(event.altKey&&key==='arrowleft'){event.preventDefault();window.happyDesktop.back();return;}
  if(event.altKey&&key==='arrowright'){event.preventDefault();window.happyDesktop.forward();}
});
