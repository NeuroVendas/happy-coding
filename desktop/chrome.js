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
const HOME='https://neurovendas.github.io/happy-coding/';
let state={activeTabId:'',tabs:[]},downloads=[],downloadsOpen=false;

function activeTab(){return state.tabs.find(tab=>tab.id===state.activeTabId)||null;}
function displayUrl(url){return url===HOME?'happy://home':url;}
function formatBytes(value){let n=Math.max(0,Number(value)||0),i=0;const units=['B','KB','MB','GB','TB'];while(n>=1024&&i<units.length-1){n/=1024;i++;}return`${n>=10||i===0?n.toFixed(0):n.toFixed(1)} ${units[i]}`;}
function originLabel(url){try{return new URL(url).hostname||url;}catch{return url||'origem desconhecida';}}
function stateLabel(item){
  if(item.state==='completed')return'Concluído';
  if(item.state==='cancelled')return'Cancelado';
  if(item.state==='interrupted')return'Interrompido';
  if(item.paused)return'Pausado';
  return item.total?`${item.percent}%`:'Baixando…';
}
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
  state=next;renderTabs();
  const tab=activeTab();
  back.disabled=!tab?.canGoBack;forward.disabled=!tab?.canGoForward;
  if(document.activeElement!==address)address.value=displayUrl(tab?.url||HOME);
  status.textContent=tab?.error||((tab?.loading)?'Carregando…':'HTTPS + SafeSearch');
  status.title=status.textContent;
}
function downloadButton(text,handler,cls=''){
  const button=document.createElement('button');button.type='button';button.textContent=text;if(cls)button.className=cls;button.addEventListener('click',handler);return button;
}
function renderDownloads(next=downloads){
  downloads=next;
  const active=downloads.filter(item=>item.state==='progressing').length;
  downloadBadge.textContent=String(Math.min(active,99));downloadBadge.classList.toggle('hidden',active===0);
  downloadsList.replaceChildren();
  if(!downloads.length){const empty=document.createElement('p');empty.className='empty-downloads';empty.textContent='Nenhum download nesta sessão.';downloadsList.append(empty);return;}
  for(const item of downloads){
    const row=document.createElement('article');row.className='download-row';
    const info=document.createElement('div');
    const name=document.createElement('div');name.className=`download-name${item.risky?' risky':''}`;name.textContent=item.filename;
    if(item.risky||item.automatic){const tag=document.createElement('span');tag.className='risk-tag';tag.textContent=item.risky?'ARQUIVO SENSÍVEL':'AUTOMÁTICO';name.append(tag);}
    const sub=document.createElement('div');sub.className='download-sub';sub.textContent=`${originLabel(item.url)} · ${formatBytes(item.received)}${item.total?` / ${formatBytes(item.total)}`:''}`;
    const progress=document.createElement('div');progress.className='download-progress';const fill=document.createElement('span');fill.style.width=`${item.state==='completed'?100:item.percent}%`;progress.append(fill);
    const stateLine=document.createElement('div');stateLine.className='download-state';stateLine.textContent=stateLabel(item);
    info.append(name,sub,progress,stateLine);
    const actions=document.createElement('div');actions.className='download-actions';
    if(item.state==='progressing'){
      if(item.paused&&item.canResume)actions.append(downloadButton('Retomar',()=>window.happyDesktop.resumeDownload(item.id)));
      else if(!item.paused&&item.canResume)actions.append(downloadButton('Pausar',()=>window.happyDesktop.pauseDownload(item.id)));
      actions.append(downloadButton('Cancelar',()=>window.happyDesktop.cancelDownload(item.id),'cancel'));
    }else if(item.state==='completed'&&item.saved)actions.append(downloadButton('Mostrar na pasta',()=>window.happyDesktop.revealDownload(item.id)));
    row.append(info,actions);downloadsList.append(row);
  }
}
async function setDownloads(open){
  downloadsOpen=!!open;downloadsBtn.classList.toggle('active',downloadsOpen);downloadPanel.classList.toggle('hidden',!downloadsOpen);downloadsBtn.setAttribute('aria-label',downloadsOpen?'Fechar downloads':'Abrir downloads');await window.happyDesktop.setDownloadsOpen(downloadsOpen);
}

document.getElementById('go').addEventListener('submit',async event=>{event.preventDefault();await window.happyDesktop.navigate(address.value);address.blur();});
back.addEventListener('click',()=>window.happyDesktop.back());
forward.addEventListener('click',()=>window.happyDesktop.forward());
reload.addEventListener('click',()=>window.happyDesktop.reload());
document.getElementById('newTab').addEventListener('click',()=>window.happyDesktop.newTab('happy://home'));
downloadsBtn.addEventListener('click',()=>setDownloads(!downloadsOpen));
document.getElementById('clearDownloads').addEventListener('click',()=>window.happyDesktop.clearFinishedDownloads());
window.happyDesktop.onBrowserState(render);
window.happyDesktop.onDownloadsState(renderDownloads);
window.happyDesktop.onFocusAddress(()=>{address.focus();address.select();});
window.happyDesktop.onNotice(message=>{status.textContent=message;status.title=message;});

document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();const mod=navigator.platform.toLowerCase().includes('mac')?event.metaKey:event.ctrlKey;
  if(event.key==='Escape'&&downloadsOpen){event.preventDefault();setDownloads(false);return;}
  if(mod&&key==='j'){event.preventDefault();setDownloads(!downloadsOpen);return;}
  if(mod&&event.shiftKey&&key==='t'){event.preventDefault();window.happyDesktop.restoreTab();return;}
  if(mod&&key==='l'){event.preventDefault();address.focus();address.select();return;}
  if(mod&&key==='t'){event.preventDefault();window.happyDesktop.newTab('happy://home');return;}
  if(mod&&key==='w'){event.preventDefault();if(state.activeTabId)window.happyDesktop.closeTab(state.activeTabId);return;}
  if(mod&&key==='tab'){event.preventDefault();window.happyDesktop.cycleTab(event.shiftKey?-1:1);return;}
  if(mod&&key==='r'){event.preventDefault();window.happyDesktop.reload();return;}
  if(event.altKey&&key==='arrowleft'){event.preventDefault();window.happyDesktop.back();return;}
  if(event.altKey&&key==='arrowright'){event.preventDefault();window.happyDesktop.forward();}
});
