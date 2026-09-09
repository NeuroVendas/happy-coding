'use strict';
const $=id=>document.getElementById(id);
let state={projects:[],github:{}},selected=null,dirty=false,repoPage=1;
const issuesByProject=new Map();
function notice(text){$('notice').textContent=text;}
async function call(action,values){const result=await window.happyWorkspace.call(action,values);if(!result.ok)throw new Error(result.error);return result.data;}
function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
function edited(){dirty=true;$('saveStatus').textContent='Alterações não salvas';}
function canLeave(){return!dirty||confirm('Descartar as alterações não salvas deste espaço?');}
function active(){return state.projects.find(p=>p.id===selected);}
function renderIssues(){
  const p=active(),list=$('issuesList'),status=$('issuesStatus'),refresh=$('refreshIssues');
  if(!list||!status||!refresh)return;list.replaceChildren();
  if(!p?.repository){refresh.disabled=true;status.textContent='Vincule um repositório GitHub para ver as tarefas.';return;}
  if(!state.github.connected){refresh.disabled=true;status.textContent='Conecte o GitHub em Conexões para consultar as issues abertas.';return;}
  refresh.disabled=false;const issues=issuesByProject.get(p.id);
  if(issues===undefined){status.textContent='Clique em Atualizar para carregar as issues abertas.';return;}
  if(!issues.length){status.textContent='Nenhuma issue aberta neste repositório.';return;}
  status.textContent=`${issues.length} issue${issues.length===1?'':'s'} aberta${issues.length===1?'':'s'}.`;
  for(const issue of issues){
    const b=node('button');b.type='button';b.className='issue-item';
    const head=node('span');head.append(node('strong',`#${issue.number} ${issue.title}`));
    if(issue.labels?.length)head.append(node('small',issue.labels.join(' · ')));
    b.append(head,node('b','↗'));
    b.addEventListener('click',async()=>{b.disabled=true;try{await call('openIssue',{url:issue.url});notice(`Issue #${issue.number} aberta em uma nova aba.`);}catch(error){notice(error.message);}finally{b.disabled=false;}});
    list.append(b);
  }
}
function render(next){
  state=next;const exists=state.projects.some(p=>p.id===selected);
  if(!exists){selected=state.projects[0]?.id||null;dirty=false;}
  $('projectList').replaceChildren();
  for(const p of state.projects){const b=node('button',p.name);b.type='button';b.setAttribute('aria-current',String(p.id===selected));b.addEventListener('click',()=>{if(p.id!==selected&&!canLeave())return;selected=p.id;dirty=false;render(state);});$('projectList').append(b);}
  $('projectForm').hidden=!selected;$('projectEmpty').hidden=!!selected;
  const p=active();if(p&&!dirty){$('projectName').value=p.name;$('notes').value=p.notes;$('repository').value=p.repository;$('links').value=p.links.join('\n');$('saveStatus').textContent='Salvo neste computador';}
  if(p){$('godotPath').textContent=p.godotProject||'Nenhum arquivo vinculado.';$('launchGodot').disabled=!p.godotProject||!state.godotConfigured;$('openRepository').disabled=!p.repository;$('openLinks').disabled=!p.links.length;$('continueProject').disabled=!p.repository&&!p.links.length&&!p.godotProject;}
  const gh=state.github;
  $('githubConnect').hidden=gh.connected;$('githubConnect').disabled=!gh.configured||gh.pending;
  $('githubDisconnect').hidden=!gh.connected;
  $('githubStatus').textContent=gh.error||(gh.connected?`Conectado como ${gh.login}.`:gh.pending?'Aguardando sua autorização no GitHub…':gh.configured?'Pronto para conectar sua conta.':'Conexão em preparação: falta registrar o aplicativo Happy Coding no GitHub. Você já pode vincular um repositório pelo endereço.');
  if(!gh.pending)$('githubDevice').hidden=true;
  $('godotStatus').textContent=state.godotConfigured?'Editor vinculado neste computador.':'Nenhum editor selecionado.';
  $('godotDisconnect').disabled=!state.godotConfigured;
  renderIssues();
}
function area(name){$('projectsArea').hidden=name!=='projects';$('connectionsArea').hidden=name!=='connections';$('projectsTab').setAttribute('aria-pressed',String(name==='projects'));$('connectionsTab').setAttribute('aria-pressed',String(name==='connections'));}
function bind(id,handler){$(id).addEventListener('click',async event=>{const b=event.currentTarget;b.disabled=true;try{await handler();}catch(error){notice(error.message);}finally{b.disabled=false;render(state);}});}
async function save(){
  if(!$('projectForm').reportValidity())return false;
  const links=$('links').value.split('\n').map(v=>v.trim()).filter(Boolean);
  if(links.length>10)throw new Error('Guarde até 10 links por projeto.');
  for(const link of links){let u;try{u=new URL(link);}catch{throw new Error('Confira os links: use endereços completos com HTTPS.');}if(u.protocol!=='https:'||u.username||u.password)throw new Error('Use links HTTPS sem credenciais.');}
  const repo=$('repository').value.trim();if(repo&&!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(repo))throw new Error('Use o endereço de um repositório: https://github.com/usuario/projeto');
  const next=await call('save',{id:selected,name:$('projectName').value,notes:$('notes').value,repository:repo,links});issuesByProject.delete(selected);dirty=false;render(next);notice('Espaço salvo neste computador.');return true;
}
$('projectForm').addEventListener('input',edited);
$('projectForm').addEventListener('submit',async event=>{event.preventDefault();try{await save();}catch(error){notice(error.message);}});
$('newProjectForm').addEventListener('submit',async event=>{event.preventDefault();if(!canLeave())return;try{const next=await call('create',{name:$('newName').value});selected=next.projects[0].id;dirty=false;render(next);$('newProjectForm').reset();notice('Espaço criado.');}catch(error){notice(error.message);}});
bind('projectsTab',()=>area('projects'));bind('connectionsTab',()=>area('connections'));
bind('removeProject',async()=>{if(!canLeave())return;issuesByProject.delete(selected);const next=await call('remove',{id:selected});dirty=false;render(next);});
bind('chooseProject',async()=>{if(dirty&&!await save())return;render(await call('chooseProject',{id:selected}));});
bind('launchGodot',async()=>{if(dirty&&!await save())return;notice(await call('launch',{id:selected})?'Godot iniciado.':'Abertura cancelada.');});
bind('continueProject',async()=>{
  if(dirty&&!await save())return;const result=await call('resume',{id:selected});const parts=[];
  if(result.openedRepository)parts.push('repositório');if(result.openedLinks)parts.push(`${result.openedLinks} referência${result.openedLinks===1?'':'s'}`);
  if(result.godotStarted)parts.push('Godot');else if(result.godotAvailable)parts.push('Godot cancelado');
  notice(parts.length?`Projeto retomado: ${parts.join(', ')}.`:'Esse espaço ainda não tem recursos para reabrir.');
});
bind('openRepository',async()=>{await call('openRepository',{id:selected});notice('Repositório aberto no navegador.');});
bind('openLinks',async()=>{await call('openLinks',{id:selected});notice('Links reabertos em novas abas, respeitando o limite do navegador.');});
bind('refreshIssues',async()=>{const id=selected;$('issuesStatus').textContent='Carregando issues…';const list=await call('issues',{id});issuesByProject.set(id,list);renderIssues();});
bind('godotConfigure',async()=>render(await call('chooseGodot')));
bind('godotDisconnect',async()=>render(await call('unlinkGodot')));
bind('githubConnect',async()=>{const data=await call('connectGitHub');if(!data)return;$('githubCode').textContent=data.userCode;$('githubExpiry').textContent=`O código vale por até ${Math.ceil(data.expiresIn/60)} minutos. Confira se a página mostra o aplicativo Happy Coding antes de autorizar.`;$('githubDevice').hidden=false;});
bind('githubBrowser',()=>call('githubBrowser'));
bind('githubCancel',async()=>render(await call('cancelGitHub')));
bind('githubDisconnect',async()=>{issuesByProject.clear();render(await call('disconnectGitHub'));notice('Conexão removida deste PC. Use Gerenciar permissões para revogá-la também no GitHub.');});
bind('githubPermissions',()=>call('githubPermissions'));
bind('captureTabs',async()=>{
  const tabs=await call('tabs');$('tabsChoices').replaceChildren();
  if(!tabs.length)$('tabsChoices').append(node('p','Nenhuma aba HTTPS disponível.'));
  for(const tab of tabs){const label=node('label'),checkbox=node('input');checkbox.type='checkbox';checkbox.value=tab.url;const description=node('span',`${tab.title}\n${tab.url}`);label.append(checkbox,description);$('tabsChoices').append(label);}
  $('tabsDialog').showModal();
});
bind('tabsApply',()=>{const old=$('links').value.split('\n').map(v=>v.trim()).filter(Boolean);const chosen=[...$('tabsChoices').querySelectorAll('input:checked')].map(input=>input.value);const combined=[...new Set([...old,...chosen])];if(combined.length>10)throw new Error('Selecione no máximo 10 links no total.');$('links').value=combined.join('\n');edited();$('tabsDialog').close();});
bind('tabsCancel',()=>$('tabsDialog').close());
async function repos(more=false){
  if(!more){repoPage=1;$('repoChoices').replaceChildren();}
  $('repoStatus').textContent='Carregando repositórios públicos…';
  try{const list=await call('repositories',{page:repoPage});
    for(const repo of list){const b=node('button',repo.name);b.className='repo-choice';b.type='button';b.append(node('small',repo.description));b.addEventListener('click',()=>{$('repository').value=repo.url;edited();$('repoDialog').close();});$('repoChoices').append(b);}
    $('repoMore').hidden=list.length<30;$('repoStatus').textContent=!more&&!list.length?'Nenhum repositório público encontrado.':'Escolha um repositório para vincular ao espaço.';repoPage++;
  }catch(error){$('repoStatus').textContent=error.message;$('repoMore').hidden=true;}
}
bind('chooseRepository',async()=>{if(!state.github.connected){area('connections');notice('Conecte o GitHub para listar seus repositórios, ou cole o endereço no espaço de projeto.');return;}$('repoDialog').showModal();await repos();});
bind('repoMore',()=>repos(true));bind('repoClose',()=>$('repoDialog').close());
window.happyWorkspace.onState(render);
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=false;}});
call('state').then(render).catch(error=>notice(error.message));
