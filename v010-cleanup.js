'use strict';
(()=>{
  const LEGACY=new Set(['soulbound','pixel-forge','quiet-forest']);
  const KEY='happyCoding.projects.v1';
  const $=id=>document.getElementById(id);
  function localProjects(){try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(p=>p&&typeof p==='object');}catch{return[];}}
  function removeLegacy(root=document){
    for(const attr of ['data-open-project','data-project-shortcut','data-project-menu']){
      root.querySelectorAll?.(`[${attr}]`).forEach(node=>{const id=node.getAttribute(attr);if(!LEGACY.has(id))return;const card=node.closest('.project-card');(card||node).remove();});
    }
  }
  function ensureEmptyState(){
    const all=$('allProjects');if(!all)return;
    const hasReal=[...all.querySelectorAll('[data-open-project]')].some(node=>!LEGACY.has(node.getAttribute('data-open-project')));
    let empty=$('hcNoProjects');
    if(hasReal){empty?.remove();return;}
    if(empty)return;
    empty=document.createElement('div');empty.id='hcNoProjects';empty.className='empty-state hc-project-empty';
    const title=document.createElement('strong');title.textContent='Nenhum projeto ainda.';
    const copy=document.createElement('p');copy.textContent='Crie seu primeiro espaço de trabalho e comece com seus próprios projetos — sem exemplos ocupando a tela.';
    const button=document.createElement('button');button.type='button';button.className='primary-btn';button.textContent='+ Criar primeiro projeto';button.addEventListener('click',()=>document.getElementById('newProjectBtn')?.click());
    empty.append(title,copy,button);all.append(empty);
  }
  function sync(){removeLegacy();const count=localProjects().length;const badge=$('projectCount');if(badge)badge.textContent=String(count);ensureEmptyState();}
  let queued=false;const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});};
  for(const id of ['projectGrid','allProjects','recentProjects']){const root=$(id);if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});}
  document.addEventListener('happy:view',schedule);document.addEventListener('happy:local-data-changed',event=>{if(event.detail?.key===KEY)schedule();});
  sync();
})();