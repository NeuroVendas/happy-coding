'use strict';
const {BrowserWindow,dialog,ipcMain,safeStorage,shell}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {spawn}=require('node:child_process');
const {MAX_PROJECTS,normalizeStore,newProject,updateProject,repository}=require('./workspace-core');
const {GitHubConnection}=require('./github-connection');
const config=require('./integrations.json');

function createWorkspaceService({userData,getTabs,openUrl}){
  const file=path.join(userData,'dev-workspaces.json');
  let store=normalizeStore({}),window=null,busy=false;
  try{store=normalizeStore(JSON.parse(fs.readFileSync(file,'utf8')));}catch(error){if(error.code!=='ENOENT'){try{fs.renameSync(file,`${file}.corrupt-${Date.now()}`);}catch{}}}
  const entry=pathToFileURL(path.join(__dirname,'workspaces.html')).href;
  const github=new GitHubConnection({clientId:config.githubClientId,vaultPath:path.join(userData,'github-connection.enc'),safeStorage,onChange:send});
  function snapshot(){return{projects:store.projects,godotConfigured:!!store.godotExecutable,github:github.state()};}
  function send(){if(window&&!window.isDestroyed())window.webContents.send('hc:workspace-state',snapshot());}
  function persist(next){
    const clean=normalizeStore(next),tmp=file+'.tmp';fs.mkdirSync(userData,{recursive:true});
    fs.writeFileSync(tmp,JSON.stringify(clean,null,2),{encoding:'utf8',mode:0o600});fs.renameSync(tmp,file);store=clean;send();return snapshot();
  }
  function project(id){const p=store.projects.find(p=>p.id===id);if(!p)throw new Error('Projeto não encontrado.');return p;}
  function replace(p){return persist({...store,projects:store.projects.map(item=>item.id===p.id?p:item)});}
  async function chooseGodot(){
    const result=await dialog.showOpenDialog(window,{title:'Escolha o executável do Godot instalado',properties:['openFile'],filters:[{name:'Godot para Windows',extensions:['exe']}]});
    if(result.canceled)return snapshot();
    const executable=fs.realpathSync(result.filePaths[0]);
    if(!/\.exe$/i.test(executable)||!fs.statSync(executable).isFile())throw new Error('Selecione o executável .exe do Godot.');
    return persist({...store,godotExecutable:executable});
  }
  async function chooseProject(id){
    const p=project(id);
    const result=await dialog.showOpenDialog(window,{title:'Escolha o project.godot deste projeto',properties:['openFile'],filters:[{name:'Projeto Godot',extensions:['godot']}]});
    if(result.canceled)return snapshot();
    const selected=fs.realpathSync(result.filePaths[0]);
    if(path.basename(selected)!=='project.godot'||!fs.statSync(selected).isFile())throw new Error('Selecione um arquivo chamado project.godot.');
    return replace({...p,godotProject:selected,updatedAt:Date.now()});
  }
  async function launch(id){
    const p=project(id);
    if(!store.godotExecutable)throw new Error('Escolha o executável do Godot em Conexões.');
    if(!p.godotProject)throw new Error('Vincule o arquivo project.godot primeiro.');
    const executable=fs.realpathSync(store.godotExecutable),selected=fs.realpathSync(p.godotProject);
    if(executable!==store.godotExecutable||selected!==p.godotProject||!/\.exe$/i.test(executable)||path.basename(selected)!=='project.godot'||!fs.statSync(executable).isFile()||!fs.statSync(selected).isFile())throw new Error('Um caminho mudou. Selecione o Godot e o projeto novamente.');
    const result=await dialog.showMessageBox(window,{type:'question',title:'Abrir projeto no Godot',message:`Abrir “${p.name}” no Godot?`,detail:`Editor: ${executable}\nProjeto: ${selected}\n\nO Godot pode executar plugins do projeto. Abra apenas projetos em que você confia.`,buttons:['Cancelar','Abrir no Godot'],defaultId:0,cancelId:0});
    if(result.response!==1)return false;
    await new Promise((resolve,reject)=>{
      const child=spawn(executable,['--editor','--path',path.dirname(selected)],{shell:false,detached:true,stdio:'ignore'});
      child.once('error',()=>reject(new Error('O Godot não iniciou. Confira o executável selecionado.')));
      child.once('spawn',()=>{child.unref();resolve();});
    });return true;
  }
  function openSavedResources(p){
    let openedRepository=false,openedLinks=0;
    const repo=repository(p.repository);
    if(repo){openUrl(repo);openedRepository=true;}
    for(const url of p.links){openUrl(url);openedLinks++;}
    return{openedRepository,openedLinks};
  }
  async function resume(id){
    const p=project(id);const opened=openSavedResources(p);
    let godotAvailable=!!store.godotExecutable&&!!p.godotProject,godotStarted=false;
    if(godotAvailable)godotStarted=await launch(id);
    return{...opened,godotAvailable,godotStarted};
  }
  function issueUrl(raw){
    try{const u=new URL(String(raw||'').trim());if(u.protocol!=='https:'||u.hostname!=='github.com'||u.username||u.password)return'';if(!/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/\d+\/?$/.test(u.pathname))return'';u.search='';u.hash='';return u.href;}catch{return'';}
  }
  const actions={
    state:()=>snapshot(),
    create:values=>{if(store.projects.length>=MAX_PROJECTS)throw new Error('Limite de 100 projetos atingido.');return persist({...store,projects:[newProject(values?.name),...store.projects]});},
    save:values=>replace(updateProject(project(values?.id),values)),
    remove:async values=>{const p=project(values?.id);const result=await dialog.showMessageBox(window,{type:'question',message:`Remover “${p.name}” do Happy Coding?`,detail:'As notas e links salvos aqui serão removidos. Os arquivos do projeto no computador permanecem intactos.',buttons:['Cancelar','Remover'],defaultId:0,cancelId:0});return result.response===1?persist({...store,projects:store.projects.filter(item=>item.id!==p.id)}):snapshot();},
    chooseGodot,
    unlinkGodot:()=>persist({...store,godotExecutable:''}),
    chooseProject:values=>chooseProject(values?.id),
    launch:values=>launch(values?.id),
    resume:values=>resume(values?.id),
    tabs:()=>getTabs().slice(0,20),
    openLinks:values=>{const p=project(values?.id);for(const url of p.links)openUrl(url);return true;},
    openRepository:values=>{const url=repository(project(values?.id).repository);if(!url)throw new Error('Vincule um repositório GitHub primeiro.');openUrl(url);return true;},
    openIssue:values=>{const url=issueUrl(values?.url);if(!url)throw new Error('Link de issue inválido.');openUrl(url);return true;},
    connectGitHub:()=>github.start(),
    cancelGitHub:()=>{github.cancel();return snapshot();},
    disconnectGitHub:()=>{github.forget();return snapshot();},
    githubBrowser:()=>shell.openExternal('https://github.com/login/device'),
    githubPermissions:()=>shell.openExternal('https://github.com/settings/applications'),
    repositories:values=>github.repositories(values?.page),
    issues:values=>github.issues(project(values?.id).repository)
  };
  ipcMain.handle('hc:workspace',async(event,action,values)=>{
    if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||event.senderFrame.url!==entry)return{ok:false,error:'Acesso negado.'};
    if(!Object.hasOwn(actions,action))return{ok:false,error:'Ação inválida.'};
    if(busy)return{ok:false,error:'Aguarde a operação atual.'};
    try{busy=true;return{ok:true,data:await actions[action](values)};}catch(error){return{ok:false,error:error.code?'Não foi possível acessar ou salvar o arquivo. Confira o caminho e as permissões.':error.message||'Não foi possível concluir.'};}finally{busy=false;}
  });
  function open(){
    if(window&&!window.isDestroyed()){window.show();window.focus();return true;}
    window=new BrowserWindow({width:1040,height:780,minWidth:760,minHeight:540,title:'Projetos e conexões — Happy Coding',backgroundColor:'#101216',webPreferences:{preload:path.join(__dirname,'workspace-preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    window.webContents.on('will-navigate',event=>event.preventDefault());
    window.webContents.on('will-redirect',event=>event.preventDefault());
    window.webContents.on('will-prevent-unload',event=>{
      const choice=dialog.showMessageBoxSync(window,{type:'question',message:'Descartar alterações não salvas?',buttons:['Continuar editando','Descartar e fechar'],defaultId:0,cancelId:0});
      if(choice===1)event.preventDefault();
    });
    window.webContents.on('did-finish-load',send);
    window.on('closed',()=>{window=null;github.cancel();});
    window.loadFile(path.join(__dirname,'workspaces.html'));
    github.restore().catch(()=>{});return true;
  }
  return{open,close:()=>{github.cancel();window?.close();}};
}
module.exports={createWorkspaceService};
