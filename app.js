'use strict';

const $=id=>document.getElementById(id);
const views=[...document.querySelectorAll('[data-view-panel]')];
const sideLinks=[...document.querySelectorAll('[data-view]')];
const LOCAL_PROJECTS_KEY='happyCoding.projects.v1';
const PROJECT_NOTES_KEY='happyCoding.projectNotes.v1';
const BOOKMARKS_KEY='happyCoding.bookmarks.v1';
const HISTORY_KEY='happyCoding.history.v1';
const STREAK_KEY='happyCoding.streak.v1';
const PROFILE_KEY='happyCoding.profile.v1';

const baseProjects=[
  {id:'soulbound',name:'Soulbound',engine:'Godot 4 · GDScript',short:'Godot',icon:'G',description:'RPG narrativo',edited:'última edição há 18 min',version:'v0.7.2',sample:true},
  {id:'pixel-forge',name:'Pixel Forge',engine:'Phaser · TypeScript',short:'Web',icon:'JS',description:'Game jam',edited:'última edição ontem',version:'v0.4.0',sample:true},
  {id:'quiet-forest',name:'Quiet Forest',engine:'Unity · C#',short:'Unity',icon:'U',description:'Experimento atmosférico',edited:'projeto recente',version:'v0.2.1',sample:true}
];

let warningUrl=null;
let currentProjectId=null;
let deferredInstallPrompt=null;
let localAI=null;
let aiLoading=false;
let aiHistory=[];

const readJson=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const writeJson=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const escapeHtml=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const getLocalProjects=()=>readJson(LOCAL_PROJECTS_KEY,[]);
const getProjects=()=>[...getLocalProjects(),...baseProjects];
const getBookmarks=()=>readJson(BOOKMARKS_KEY,[]);
const getHistory=()=>readJson(HISTORY_KEY,[]);

function toast(message){
  const t=$('toast');
  t.textContent=message;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>t.classList.add('hidden'),2400);
}

function showView(name,record=true){
  if(!views.some(v=>v.dataset.viewPanel===name)) name='home';
  if(record&&location.hash!==`#${name}`)history.pushState({view:name},'',`#${name}`);
  views.forEach(v=>v.classList.toggle('active',v.dataset.viewPanel===name));
  sideLinks.forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  $('menuPanel').classList.add('hidden');
  if(name==='projects') renderProjects();
  if(name==='settings') updateSettingsCounts();
  if(name==='bookmarks'||name==='history') renderCollection(name);
  document.dispatchEvent(new CustomEvent('happy:view',{detail:name}));
  window.scrollTo({top:0,behavior:'smooth'});
}
window.addEventListener('popstate',()=>showView(location.hash.slice(1)||'home',false));
sideLinks.forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-view-jump]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.viewJump)));

function projectCard(p){
  return `<article class="project-card">
    <div class="project-top"><span class="project-symbol">${escapeHtml(p.icon||'•')}</span><button class="project-menu" data-project-menu="${escapeHtml(p.id)}" title="Abrir espaço do projeto">•••</button></div>
    <span class="tech-pill">${escapeHtml(String(p.engine).toUpperCase())}</span>
    <h3>${escapeHtml(p.name)}</h3>
    <p>${escapeHtml(p.description||'Novo projeto')} · ${escapeHtml(p.sample?'projeto de exemplo':p.edited||'salvo neste navegador')}</p>
    <footer><span>${escapeHtml(p.sample?'Exemplo':p.version||'local')}</span><button data-open-project="${escapeHtml(p.id)}">Abrir projeto →</button></footer>
  </article>`;
}

function renderProjects(){
  const projects=getProjects();
  const homeCards=projects.slice(0,2).map(projectCard).join('')+`<article class="project-card new-project-card" id="newProjectCard"><div class="new-project-plus">+</div><h3>Começar algo novo</h3><p>Crie um espaço para seu próximo jogo, site ou experimento.</p><footer><span></span><button type="button">Novo projeto</button></footer></article>`;
  $('projectGrid').innerHTML=homeCards;
  $('allProjects').innerHTML=projects.map(projectCard).join('');
  $('projectCount').textContent=String(projects.length);
  $('recentProjects').innerHTML=projects.slice(0,3).map(p=>`<button data-project-shortcut="${escapeHtml(p.id)}">${escapeHtml(p.name)} <span>${escapeHtml(p.short||String(p.engine).split('·')[0].trim())}</span></button>`).join('');
  document.querySelectorAll('[data-open-project],[data-project-shortcut],[data-project-menu]').forEach(btn=>btn.addEventListener('click',()=>openProjectWorkspace(btn.dataset.openProject||btn.dataset.projectShortcut||btn.dataset.projectMenu)));
  const np=$('newProjectCard');
  if(np) np.addEventListener('click',()=>$('projectModal').classList.remove('hidden'));
}

function openProjectWorkspace(id){
  const p=getProjects().find(x=>x.id===id);
  if(!p) return;
  currentProjectId=id;
  const notes=readJson(PROJECT_NOTES_KEY,{});
  $('workspaceEngine').textContent=p.engine;
  $('workspaceName').textContent=p.name;
  $('workspaceDescription').textContent=p.description||'Sem descrição.';
  $('workspaceNotes').value=notes[id]||'';
  $('workspaceDelete').classList.toggle('hidden',!!p.sample);
  $('projectWorkspaceModal').classList.remove('hidden');
}

$('workspaceSave').addEventListener('click',()=>{
  if(!currentProjectId) return;
  const notes=readJson(PROJECT_NOTES_KEY,{});
  notes[currentProjectId]=$('workspaceNotes').value;
  writeJson(PROJECT_NOTES_KEY,notes);
  toast('Notas do projeto salvas neste dispositivo.');
});

$('workspaceDelete').addEventListener('click',()=>{
  if(!currentProjectId) return;
  const local=getLocalProjects();
  const p=local.find(x=>x.id===currentProjectId);
  if(!p) return;
  if(!confirm(`Excluir o projeto “${p.name}” deste dispositivo?`)) return;
  writeJson(LOCAL_PROJECTS_KEY,local.filter(x=>x.id!==currentProjectId));
  const notes=readJson(PROJECT_NOTES_KEY,{});
  delete notes[currentProjectId];
  writeJson(PROJECT_NOTES_KEY,notes);
  currentProjectId=null;
  $('projectWorkspaceModal').classList.add('hidden');
  renderProjects();
  toast('Projeto excluído.');
});

$('newProjectBtn').addEventListener('click',()=>$('projectModal').classList.remove('hidden'));
$('projectForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('projectName').value.trim();
  if(!name) return;
  const items=getLocalProjects();
  items.unshift({id:crypto.randomUUID?.()||String(Date.now()),name,engine:$('projectEngine').value,short:'Local',icon:'+',description:$('projectDescription').value.trim(),edited:'salvo neste navegador',version:'local'});
  writeJson(LOCAL_PROJECTS_KEY,items);
  $('projectForm').reset();
  $('projectModal').classList.add('hidden');
  renderProjects();
  toast('Projeto criado neste navegador.');
});

document.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.closeModal).classList.add('hidden')));

function setupProfile(){
  const p=readJson(PROFILE_KEY,{name:'Visitante'});
  const name=(p.name||'Visitante').trim()||'Visitante';
  const initials=name==='Visitante'?'HC':name.split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('');
  $('profileInitials').textContent=initials||'HC';
  $('profileLabel').textContent=name;
  $('displayName').textContent=name;
  $('profileName').value=name==='Visitante'?'':name;
}
$('profileBtn').addEventListener('click',()=>{$('profileModal').classList.remove('hidden');$('profileName').focus()});
$('profileForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('profileName').value.trim()||'Visitante';
  writeJson(PROFILE_KEY,{name});
  setupProfile();
  $('profileModal').classList.add('hidden');
  toast('Perfil local salvo.');
});

function isAdultQuery(q){
  const t=q.toLowerCase();
  return ['porn','porno','pornografia','hentai','xvideos','xnxx','onlyfans nude','nudes','sexo explícito','sex videos','rule34','nhentai'].some(x=>t.includes(x));
}
function needsContentWarning(url){const s=url.toLowerCase();return ['horror','terror','gore-game','violent-game','mature-game'].some(x=>s.includes(x));}
function normalizeTarget(raw){
  const v=raw.trim();
  if(!v||v==='happy://home') return{kind:'home'};
  if(isAdultQuery(v)) return{kind:'blocked'};
  if(/^https?:\/\//i.test(v)) return{kind:'url',url:v};
  if(/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v)) return{kind:'url',url:'https://'+v};
  return{kind:'url',url:'https://www.google.com/search?safe=active&q='+encodeURIComponent(v)};
}
function addHistory(url){const h=getHistory();h.unshift({url,at:new Date().toISOString()});writeJson(HISTORY_KEY,h.slice(0,100));}
function navigate(raw){
  const t=normalizeTarget(raw);
  if(t.kind==='home'){showView('home');$('addressInput').value='happy://home';return;}
  if(t.kind==='blocked'){$('blockedModal').classList.remove('hidden');return;}
  if(needsContentWarning(t.url)){warningUrl=t.url;$('warningModal').classList.remove('hidden');return;}
  addHistory(t.url);
  window.open(t.url,'_blank','noopener');
  $('addressInput').value=t.url;
}

$('addressForm').addEventListener('submit',e=>{e.preventDefault();navigate($('addressInput').value)});
$('universalSearch').addEventListener('submit',e=>{e.preventDefault();navigate($('searchInput').value)});
$('homeBtn').addEventListener('click',()=>navigate('happy://home'));
$('reloadBtn').addEventListener('click',()=>location.reload());
$('backBtn').addEventListener('click',()=>history.back());
$('forwardBtn').addEventListener('click',()=>history.forward());
$('happyTab').addEventListener('click',()=>navigate('happy://home'));
$('godotTab').addEventListener('click',()=>navigate('https://docs.godotengine.org'));
$('newTabBtn').addEventListener('click',()=>{showView('home');$('addressInput').value='';$('addressInput').focus();toast('Digite um endereço ou uma pesquisa.');});

function saveCurrentBookmark(){
  const url=$('addressInput').value||'happy://home';
  const list=getBookmarks();
  if(list.some(i=>i.url===url)){toast('Esse endereço já está nos favoritos.');return;}
  list.unshift({url,title:url==='happy://home'?'Happy Coding =]':url});
  writeJson(BOOKMARKS_KEY,list);
  updateSettingsCounts();
  toast('Favorito salvo localmente.');
}
$('bookmarkBtn').addEventListener('click',saveCurrentBookmark);
function updateSettingsCounts(){const n=getBookmarks().length;$('bookmarkCount').textContent=`${n} salvo${n===1?'':'s'}`;$('menuBookmarkCount').textContent=String(n);}
$('clearHistory').addEventListener('click',()=>{writeJson(HISTORY_KEY,[]);toast('Histórico local apagado.');});
$('menuBtn').addEventListener('click',()=>$('menuPanel').classList.toggle('hidden'));
$('closeMenu').addEventListener('click',()=>$('menuPanel').classList.add('hidden'));
$('menuBookmarks').addEventListener('click',()=>showView('bookmarks'));
$('menuHistory').addEventListener('click',()=>showView('history'));
function renderCollection(kind){
  const list=kind==='bookmarks'?getBookmarks():getHistory();
  const root=$(kind==='bookmarks'?'bookmarksList':'historyList');
  root.replaceChildren();
  if(!list.length){const p=document.createElement('p');p.className='empty-state';p.textContent=kind==='bookmarks'?'Nenhum favorito salvo. Abra um endereço e use Ctrl D para guardar aqui.':'Seu histórico está vazio.';root.append(p);return;}
  list.forEach((item,index)=>{
    const row=document.createElement('article');row.className='collection-item';
    const open=document.createElement('button');open.className='collection-open';open.textContent=item.title||item.url;
    if(item.at){const date=document.createElement('small');date.textContent=new Date(item.at).toLocaleString('pt-BR');open.append(date);}
    open.addEventListener('click',()=>navigate(item.url));
    const remove=document.createElement('button');remove.className='secondary-btn';remove.textContent='Remover';
    remove.addEventListener('click',()=>{const current=kind==='bookmarks'?getBookmarks():getHistory();current.splice(index,1);writeJson(kind==='bookmarks'?BOOKMARKS_KEY:HISTORY_KEY,current);renderCollection(kind);updateSettingsCounts();});
    row.append(open,remove);root.append(row);
  });
}
$('saveBookmarkView').addEventListener('click',()=>{saveCurrentBookmark();renderCollection('bookmarks');});
$('clearHistoryView').addEventListener('click',()=>{if(confirm('Apagar o histórico deste dispositivo?')){writeJson(HISTORY_KEY,[]);renderCollection('history');}});

$('warningCancel').addEventListener('click',()=>{warningUrl=null;$('warningModal').classList.add('hidden')});
$('warningContinue').addEventListener('click',()=>{const u=warningUrl;warningUrl=null;$('warningModal').classList.add('hidden');if(u){addHistory(u);window.open(u,'_blank','noopener')}});
document.querySelectorAll('[data-external]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.external)));
function appendChat(role,text,id=''){
  const p=document.createElement('p');
  p.className=role==='user'?'user':'bot';
  if(id)p.id=id;
  p.textContent=text;
  $('chatLog').appendChild(p);
  $('chatLog').scrollTop=$('chatLog').scrollHeight;
  return p;
}
$('mascotBtn').addEventListener('click',()=>$('mascotPanel').classList.toggle('hidden'));
$('closeMascot').addEventListener('click',()=>$('mascotPanel').classList.add('hidden'));
$('enableLocalAI').addEventListener('click',async()=>{
  if(localAI||aiLoading)return;
  aiLoading=true;
  $('enableLocalAI').disabled=true;
  $('aiStatus').textContent='carregando IA…';
  try{
    const mod=await import('./ai-local.js');
    localAI=await mod.createLocalAssistant(msg=>{$('aiProgress').textContent=msg});
    $('aiStatus').textContent='IA local ativa';
    $('aiActivate').classList.add('hidden');
    toast('IA local ativada =]');
  }catch(err){
    console.error(err);
    $('aiStatus').textContent='modo básico';
    $('aiProgress').textContent='Não foi possível carregar a IA neste aparelho/navegador.';
    $('enableLocalAI').disabled=false;
    toast('A IA local não carregou neste dispositivo.');
  }finally{aiLoading=false;}
});

$('chatForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const input=$('chatInput');
  const text=input.value.trim();
  if(!text)return;
  appendChat('user',text);
  input.value='';
  if(localAI){
    const thinking=appendChat('bot','Pensando… =]','aiThinking');
    try{
      const reply=await localAI.ask(text,aiHistory);
      thinking.textContent=reply;
      aiHistory.push({role:'user',content:text},{role:'assistant',content:reply});
      aiHistory=aiHistory.slice(-12);
    }catch(err){console.error(err);thinking.textContent='Tive um erro ao gerar a resposta. Tenta de novo =]';}
    return;
  }
  const replies=['Posso ajudar melhor quando você ativar a IA local acima =]','As ferramentas do Happy Coding já funcionam; a IA local é opcional e grátis.','Se você estiver programando, me diga a linguagem e o erro. Ative a IA local para eu responder de verdade =]'];
  setTimeout(()=>appendChat('bot',replies[Math.floor(Math.random()*replies.length)]),180);
});

$('feedbackBtn').addEventListener('click',()=>window.open('https://github.com/NeuroVendas/happy-coding/issues/new?title=Feedback%20Happy%20Coding%20%3D%5D','_blank','noopener'));
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('searchInput').focus();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();saveCurrentBookmark();}
});

function setupGreeting(){
  const h=new Date().getHours();
  $('greeting').textContent=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
  const stored=readJson(STREAK_KEY,null),today=new Date().toISOString().slice(0,10);
  let days=1;
  if(!stored)writeJson(STREAK_KEY,{last:today,days});
  else{
    days=stored.days||1;
    if(stored.last!==today){const diff=(new Date(today)-new Date(stored.last))/86400000;days=diff===1?days+1:diff>1?1:days;writeJson(STREAK_KEY,{last:today,days});}
  }
  $('streakDays').textContent=String(days);
}

function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}
async function triggerInstall(){
  if(isStandalone()){toast('Happy Coding já está instalado =]');return;}
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    $('installAppBtn').classList.add('hidden');
    return;
  }
  toast('Se o botão de instalação não aparecer, use o menu do navegador → Instalar/Adicionar à tela inicial.');
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installAppBtn').classList.remove('hidden');});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;$('installAppBtn').classList.add('hidden');toast('Happy Coding instalado! =]');});
$('installAppBtn').addEventListener('click',triggerInstall);
$('installSettingsBtn').addEventListener('click',triggerInstall);
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker:',err)));}

setupGreeting();
setupProfile();
renderProjects();
renderClock();
updateSettingsCounts();
if(views.some(v=>v.dataset.viewPanel===location.hash.slice(1)))showView(location.hash.slice(1),false);
