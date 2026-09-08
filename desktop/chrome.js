'use strict';
const address=document.getElementById('address');
const tabsRoot=document.getElementById('tabs');
const back=document.getElementById('back');
const forward=document.getElementById('forward');
const reload=document.getElementById('reload');
const status=document.getElementById('status');
const HOME='https://neurovendas.github.io/happy-coding/';
let state={activeTabId:'',tabs:[]};

function activeTab(){return state.tabs.find(tab=>tab.id===state.activeTabId)||null;}
function displayUrl(url){return url===HOME?'happy://home':url;}
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

document.getElementById('go').addEventListener('submit',async event=>{event.preventDefault();await window.happyDesktop.navigate(address.value);address.blur();});
back.addEventListener('click',()=>window.happyDesktop.back());
forward.addEventListener('click',()=>window.happyDesktop.forward());
reload.addEventListener('click',()=>window.happyDesktop.reload());
document.getElementById('newTab').addEventListener('click',()=>window.happyDesktop.newTab('happy://home'));
window.happyDesktop.onBrowserState(render);
window.happyDesktop.onFocusAddress(()=>{address.focus();address.select();});
window.happyDesktop.onNotice(message=>{status.textContent=message;status.title=message;});

document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();const mod=navigator.platform.toLowerCase().includes('mac')?event.metaKey:event.ctrlKey;
  if(mod&&event.shiftKey&&key==='t'){event.preventDefault();window.happyDesktop.restoreTab();return;}
  if(mod&&key==='l'){event.preventDefault();address.focus();address.select();return;}
  if(mod&&key==='t'){event.preventDefault();window.happyDesktop.newTab('happy://home');return;}
  if(mod&&key==='w'){event.preventDefault();if(state.activeTabId)window.happyDesktop.closeTab(state.activeTabId);return;}
  if(mod&&key==='tab'){event.preventDefault();window.happyDesktop.cycleTab(event.shiftKey?-1:1);return;}
  if(mod&&key==='r'){event.preventDefault();window.happyDesktop.reload();return;}
  if(event.altKey&&key==='arrowleft'){event.preventDefault();window.happyDesktop.back();return;}
  if(event.altKey&&key==='arrowright'){event.preventDefault();window.happyDesktop.forward();}
});
