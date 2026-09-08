'use strict';

const $ = (id) => document.getElementById(id);
const views = [...document.querySelectorAll('[data-view-panel]')];
const sideLinks = [...document.querySelectorAll('[data-view]')];
const LOCAL_PROJECTS_KEY = 'happyCoding.projects.v1';
const BOOKMARKS_KEY = 'happyCoding.bookmarks.v1';
const HISTORY_KEY = 'happyCoding.history.v1';
const STREAK_KEY = 'happyCoding.streak.v1';

const baseProjects = [
  {id:'soulbound',name:'Soulbound',engine:'Godot 4 · GDScript',description:'RPG narrativo',version:'v0.7.2'},
  {id:'pixel-forge',name:'Pixel Forge',engine:'Phaser · TypeScript',description:'Game jam',version:'v0.4.0'},
  {id:'quiet-forest',name:'Quiet Forest',engine:'Unity · C#',description:'Experimento atmosférico',version:'v0.2.1'}
];

let warningUrl = null;
let focusSeconds = 25 * 60;
let focusTimer = null;

function readJson(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function getProjects(){ return [...baseProjects, ...readJson(LOCAL_PROJECTS_KEY, [])]; }
function getBookmarks(){ return readJson(BOOKMARKS_KEY, []); }
function getHistory(){ return readJson(HISTORY_KEY, []); }
function toast(message){ const t=$('toast'); t.textContent=message; t.classList.remove('hidden'); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.add('hidden'),2200); }

function showView(name){
  views.forEach(v=>v.classList.toggle('active',v.dataset.viewPanel===name));
  sideLinks.forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  $('menuPanel').classList.add('hidden');
  if(name==='projects') renderProjects();
  if(name==='settings') updateSettingsCounts();
  window.scrollTo({top:0,behavior:'smooth'});
}
sideLinks.forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-view-jump]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.viewJump)));

function renderProjects(){
  const projects=getProjects();
  const markup=projects.map(p=>`<article class="project-card"><div class="project-top"><span class="tech-pill">${escapeHtml(p.engine)}</span><span>•••</span></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||'Novo projeto')}</p><footer><span>${escapeHtml(p.version||'local')}</span><button data-open-project="${escapeHtml(p.id)}">Abrir projeto →</button></footer></article>`).join('');
  $('projectGrid').innerHTML=markup;
  $('allProjects').innerHTML=markup;
  $('projectCount').textContent=String(projects.length);
  $('recentProjects').innerHTML=projects.slice(0,4).map(p=>`<button data-project-shortcut="${escapeHtml(p.id)}">${escapeHtml(p.name)} · ${escapeHtml(p.engine.split('·')[0].trim())}</button>`).join('');
  document.querySelectorAll('[data-open-project],[data-project-shortcut]').forEach(btn=>btn.addEventListener('click',()=>toast('Editor de projetos entra na próxima etapa =]')));
}
function escapeHtml(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

$('newProjectBtn').addEventListener('click',()=>$('projectModal').classList.remove('hidden'));
$('projectForm').addEventListener('submit',(e)=>{
  e.preventDefault();
  const items=readJson(LOCAL_PROJECTS_KEY,[]);
  items.unshift({id:crypto.randomUUID?.()||String(Date.now()),name:$('projectName').value.trim(),engine:$('projectEngine').value,description:$('projectDescription').value.trim(),version:'local'});
  writeJson(LOCAL_PROJECTS_KEY,items);
  $('projectForm').reset();
  $('projectModal').classList.add('hidden');
  renderProjects();
  toast('Projeto criado neste navegador.');
});
document.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.closeModal).classList.add('hidden')));

function isAdultQuery(q){
  const text=q.toLowerCase();
  const explicit=['porn','porno','pornografia','hentai','xvideos','xnxx','onlyfans nude','nudes','sexo explícito','sex videos','rule34','nhentai'];
  return explicit.some(term=>text.includes(term));
}
function needsContentWarning(url){
  const s=url.toLowerCase();
  return ['horror','terror','gore-game','violent-game','mature-game'].some(term=>s.includes(term));
}
function normalizeTarget(raw){
  const value=raw.trim();
  if(!value||value==='happy://home') return {kind:'home'};
  if(isAdultQuery(value)) return {kind:'blocked'};
  if(/^https?:\/\//i.test(value)) return {kind:'url',url:value};
  if(/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(value)) return {kind:'url',url:'https://'+value};
  return {kind:'url',url:'https://www.google.com/search?safe=active&q='+encodeURIComponent(value)};
}
function addHistory(url){
  const history=getHistory();
  history.unshift({url,at:new Date().toISOString()});
  writeJson(HISTORY_KEY,history.slice(0,100));
}
function navigate(raw){
  const target=normalizeTarget(raw);
  if(target.kind==='home'){ showView('home'); $('addressInput').value='happy://home'; return; }
  if(target.kind==='blocked'){ $('blockedModal').classList.remove('hidden'); return; }
  if(needsContentWarning(target.url)){ warningUrl=target.url; $('warningModal').classList.remove('hidden'); return; }
  addHistory(target.url);
  window.open(target.url,'_blank','noopener');
  $('addressInput').value=target.url;
}
$('addressForm').addEventListener('submit',e=>{e.preventDefault();navigate($('addressInput').value)});
$('universalSearch').addEventListener('submit',e=>{e.preventDefault();navigate($('searchInput').value)});
$('homeBtn').addEventListener('click',()=>navigate('happy://home'));
$('reloadBtn').addEventListener('click',()=>location.reload());
$('backBtn').addEventListener('click',()=>history.back());
$('forwardBtn').addEventListener('click',()=>history.forward());
$('newTabBtn').addEventListener('click',()=>{showView('home');$('addressInput').value='happy://home';toast('Nova aba web simulada. No app desktop as abas são reais.');});

$('bookmarkBtn').addEventListener('click',()=>{
  const url=$('addressInput').value||'happy://home';
  const list=getBookmarks();
  if(!list.some(i=>i.url===url)){list.unshift({url,title:url==='happy://home'?'Happy Coding =]':url});writeJson(BOOKMARKS_KEY,list);toast('Favorito salvo localmente.');}
  else toast('Esse endereço já está nos favoritos.');
  updateSettingsCounts();
});
function updateSettingsCounts(){
  const n=getBookmarks().length;
  $('bookmarkCount').textContent=`${n} salvo${n===1?'':'s'}`;
  $('menuBookmarkCount').textContent=String(n);
}
$('clearHistory').addEventListener('click',()=>{writeJson(HISTORY_KEY,[]);toast('Histórico local apagado.');});

$('menuBtn').addEventListener('click',()=>$('menuPanel').classList.toggle('hidden'));
$('closeMenu').addEventListener('click',()=>$('menuPanel').classList.add('hidden'));
$('menuBookmarks').addEventListener('click',()=>{
  const list=getBookmarks();
  if(!list.length) return toast('Nenhum favorito ainda.');
  const chosen=prompt('Favoritos:\n\n'+list.map((x,i)=>`${i+1}. ${x.title}`).join('\n')+'\n\nDigite o número para abrir:');
  const idx=Number(chosen)-1; if(list[idx]) navigate(list[idx].url);
});
$('menuHistory').addEventListener('click',()=>{
  const list=getHistory(); if(!list.length) return toast('Histórico local vazio.');
  alert('Histórico local recente:\n\n'+list.slice(0,10).map(x=>x.url).join('\n'));
});

$('warningCancel').addEventListener('click',()=>{warningUrl=null;$('warningModal').classList.add('hidden')});
$('warningContinue').addEventListener('click',()=>{const u=warningUrl;warningUrl=null;$('warningModal').classList.add('hidden');if(u){addHistory(u);window.open(u,'_blank','noopener')}});

document.querySelectorAll('[data-external]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.external)));
document.querySelectorAll('[data-tool]').forEach(btn=>btn.addEventListener('click',()=>showView('tools')));

$('formatJson').addEventListener('click',()=>{
  try{$('jsonInput').value=JSON.stringify(JSON.parse($('jsonInput').value),null,2);$('jsonStatus').textContent='JSON válido ✓';}
  catch{$('jsonStatus').textContent='JSON inválido';}
});
$('colorPicker').addEventListener('input',e=>{const v=e.target.value.toUpperCase();$('colorPreview').style.background=v;$('colorValue').textContent=v;});
$('testRegex').addEventListener('click',()=>{
  try{const re=new RegExp($('regexPattern').value,'gi');const matches=$('regexText').value.match(re)||[];$('regexStatus').textContent=`${matches.length} correspondência(s)`;}
  catch{$('regexStatus').textContent='Expressão inválida';}
});
function renderClock(){const m=String(Math.floor(focusSeconds/60)).padStart(2,'0');const s=String(focusSeconds%60).padStart(2,'0');$('focusClock').textContent=`${m}:${s}`;}
$('focusStart').addEventListener('click',()=>{
  if(focusTimer){clearInterval(focusTimer);focusTimer=null;$('focusStart').textContent='Iniciar';return;}
  $('focusStart').textContent='Pausar';focusTimer=setInterval(()=>{if(focusSeconds>0){focusSeconds--;renderClock();}else{clearInterval(focusTimer);focusTimer=null;$('focusStart').textContent='Iniciar';toast('Focus run concluído! =]');}},1000);
});
$('focusReset').addEventListener('click',()=>{if(focusTimer)clearInterval(focusTimer);focusTimer=null;focusSeconds=1500;renderClock();$('focusStart').textContent='Iniciar';});

$('mascotBtn').addEventListener('click',()=>$('mascotPanel').classList.toggle('hidden'));
$('closeMascot').addEventListener('click',()=>$('mascotPanel').classList.add('hidden'));
$('chatForm').addEventListener('submit',e=>{
  e.preventDefault();const input=$('chatInput');const text=input.value.trim();if(!text)return;
  $('chatLog').insertAdjacentHTML('beforeend',`<p class="user">${escapeHtml(text)}</p>`);input.value='';
  const replies=['Ainda sou um mascote local, mas a IA real vem depois =]','Boa ideia. Podemos transformar isso em um projeto do Happy Coding.','Se der erro, cola a mensagem e a gente investiga =]','Meu trabalho aqui é te ajudar a continuar criando sem bagunçar seus arquivos.'];
  setTimeout(()=>{$('chatLog').insertAdjacentHTML('beforeend',`<p class="bot">${replies[Math.floor(Math.random()*replies.length)]}</p>`);$('chatLog').scrollTop=$('chatLog').scrollHeight;},260);
});

$('feedbackBtn').addEventListener('click',()=>toast('Feedback interno entra numa próxima versão.'));
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('searchInput').focus();}});

function setupGreeting(){
  const hour=new Date().getHours();$('greeting').textContent=hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite';
  const stored=readJson(STREAK_KEY,null);const today=new Date().toISOString().slice(0,10);let days=12;
  if(!stored){writeJson(STREAK_KEY,{last:today,days});}else{days=stored.days||12;if(stored.last!==today){const diff=(new Date(today)-new Date(stored.last))/86400000;if(diff===1)days++;else if(diff>1)days=1;writeJson(STREAK_KEY,{last:today,days});}}
  $('streakDays').textContent=String(days);
}

setupGreeting();renderProjects();renderClock();updateSettingsCounts();