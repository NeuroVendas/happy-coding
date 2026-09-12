'use strict';
const {WebContentsView,session,ipcMain,dialog,Menu,clipboard,app}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {randomUUID}=require('node:crypto');
const core=require('./developer-core');
const scripts=require('./developer-scripts');
const WORLD=1101;
const secure={nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false};
function createDeveloperService({win,currentTab,getTabs,top,resize,notice,openUrl,userData}){
  const file=path.join(userData,'developer-projects.json');
  const panelUrl=pathToFileURL(path.join(__dirname,'developer.html')).href;
  let data={projects:[],tests:[]};
  try{data=core.normalize(JSON.parse(fs.readFileSync(file,'utf8')));}catch(e){if(e.code!=='ENOENT'){try{fs.renameSync(file,`${file}.corrupt-${Date.now()}`);}catch{}}}
  let panel=null,enabled=false,previews=[],mode='page',selected=0,sync=false,syncBusy=false,busy=false,destroyed=false;
  let events=[],recording=null,recordBusy=false,before=null,after=null,elapsed=0,playStarted=0;
  const attached=new WeakSet();
  const ownedSessions=new Set();
  const network={};
  const apiSession=session.fromPartition(`hc-dev-api-${randomUUID()}`);
  harden(apiSession);ownedSessions.add(apiSession);
  function harden(s){
    s.setPermissionRequestHandler((_w,_p,cb)=>cb(false));s.setPermissionCheckHandler(()=>false);
    s.on('will-download',e=>e.preventDefault());
    s.webRequest.onBeforeRequest((details,cb)=>{
      if(!/^https?:/.test(details.url)){cb({});return;}
      const target=core.target(details.url);
      cb(!target?{cancel:true}:target!==details.url?{redirectURL:target}:{});
    });
    s.webRequest.onErrorOccurred(d=>{if(d.webContentsId===wc()?.id)log('rede',`${d.error}: ${core.safeUrl(d.url)}`);});
    s.webRequest.onCompleted(d=>{if(d.statusCode>=400&&d.webContentsId===wc()?.id)log('HTTP',`${d.statusCode}: ${core.safeUrl(d.url)}`);});
  }
  function save(){fs.mkdirSync(userData,{recursive:true});fs.writeFileSync(`${file}.tmp`,JSON.stringify(data,null,2),{mode:0o600});fs.renameSync(`${file}.tmp`,file);}
  function wc(){return previews.length?previews[selected]?.webContents:currentTab()?.view.webContents;}
  function usable(){const w=wc();if(!w||w.isDestroyed()||!core.target(w.getURL()))throw Error('Abra uma página HTTPS ou um projeto localhost.');return w;}
  function exec(w,code){return w.executeJavaScriptInIsolatedWorld(WORLD,[{code}],false);}
  function state(){return{enabled,mode,selected,sync,network:network[selected]||'online',url:wc()?.getURL()||'',projects:data.projects,tests:data.tests,events,recording:!!recording,steps:recording?.steps||[],playtest:!!playStarted,elapsed:playStarted?Date.now()-playStarted:elapsed};}
  function emit(){if(panel&&!panel.webContents.isDestroyed())panel.webContents.send('hc:dev-state',state());}
  function log(kind,message){if(!enabled)return;events.push({at:new Date().toISOString(),kind,message:core.redact(message)});events=events.slice(-100);emit();}
  function attach(w){
    if(attached.has(w))return;attached.add(w);
    w.on('console-message',(_e,details,...legacy)=>{const message=_e.message||(typeof details==='object'?details.message:legacy[0]);if(w===wc()&&message)log('console',message);});
    w.on('did-fail-load',(_e,code,description,url,main)=>{if(w===wc()&&code!==-3)log(main?'navegação':'recurso',`${description}: ${core.safeUrl(url)}`);});
    w.on('render-process-gone',(_e,details)=>{if(w===wc())log('processo',details.reason);});
    w.on('before-input-event',(e,input)=>{
      if(input.type!=='keyDown')return;
      const mod=process.platform==='darwin'?input.meta:input.control;
      if(input.key==='F12'||(mod&&input.shift&&String(input.key).toLowerCase()==='i')){e.preventDefault();toggleDevTools(w);}
      if(mod&&input.shift&&String(input.key).toLowerCase()==='d'){e.preventDefault();toggle();}
    });
    w.on('context-menu',(_e,p)=>Menu.buildFromTemplate([{label:'Inspecionar elemento',click:()=>{w.inspectElement(p.x,p.y);}}]).popup({window:win}));
  }
  function toggleDevTools(w=wc()){if(!w||w.isDestroyed())return;w.isDevToolsOpened()?w.closeDevTools():w.openDevTools({mode:'detach'});}
  function ensurePanel(){
    if(panel)return;
    panel=new WebContentsView({webPreferences:{...secure,preload:path.join(__dirname,'developer-preload.js')}});
    win.contentView.addChildView(panel);
    panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    panel.webContents.on('will-navigate',e=>e.preventDefault());panel.webContents.on('will-redirect',e=>e.preventDefault());
    panel.webContents.on('did-finish-load',emit);
    panel.webContents.loadFile(path.join(__dirname,'developer.html'));
  }
  function toggle(){enabled=!enabled;ensurePanel();if(!enabled){stopRecording();closePreviews();}panel.setVisible(enabled);resize();emit();return enabled;}
  function layout(){
    if(!enabled)return false;
    const b=win.getContentBounds(),y=top(),height=Math.max(1,b.height-y),side=Math.min(380,Math.floor(b.width*.48)),width=b.width-side;
    panel.setBounds({x:width,y,width:side,height});
    for(const tab of getTabs()){tab.view.setVisible(!previews.length&&tab===currentTab());if(tab===currentTab())tab.view.setBounds({x:0,y,width,height});}
    previews.forEach((view,i)=>{const slot=Math.floor(width/previews.length);view.setBounds({x:i*slot,y,width:i===previews.length-1?width-i*slot:slot,height});view.setVisible(true);if(mode==='responsive')view.webContents.enableDeviceEmulation({screenPosition:'desktop',screenSize:{width:0,height:0},deviceScaleFactor:0,viewPosition:{x:0,y:0},viewSize:{width:[390,768,1440][i],height:900},scale:Math.min(1,slot/[390,768,1440][i])});});
    return true;
  }
  function closePreviews(){
    stopRecording();
    for(const v of previews){if(!win.isDestroyed())win.contentView.removeChildView(v);if(!v.webContents.isDestroyed()){const s=v.webContents.session;s.disableNetworkEmulation();v.webContents.close();s.closeAllConnections().catch(()=>{});s.clearStorageData().catch(()=>{});ownedSessions.delete(s);}}
    previews=[];selected=0;mode='page';sync=false;for(const key of Object.keys(network))delete network[key];
    for(const tab of getTabs())if(!tab.view.webContents.isDestroyed())tab.view.setVisible(tab===currentTab());
  }
  async function makePreviews(kind,raw){
    const url=core.target(raw);if(!url)throw Error('Endereço inválido. Use HTTPS ou localhost.');
    closePreviews();mode=kind;
    // A new temporary partition per environment: no cookies from normal browsing.
    const group=randomUUID();
    previews=Array.from({length:3},(_,i)=>{
      const s=session.fromPartition(`hc-dev-${group}-${i}`);harden(s);ownedSessions.add(s);
      const v=new WebContentsView({webPreferences:{...secure,session:s}}),w=v.webContents;attach(w);
      w.setWindowOpenHandler(({url:dest})=>{const safe=core.target(dest);if(safe)w.loadURL(safe).catch(()=>{});return{action:'deny'};});
      for(const event of ['will-navigate','will-redirect'])w.on(event,(e,dest)=>{if(!core.target(dest))e.preventDefault();});
      w.on('focus',()=>{selected=i;emit();});
      w.on('did-navigate',(_e,dest)=>{
        if(sync&&i===selected){for(const other of previews)if(other!==v&&other.webContents.getURL()!==dest&&core.target(dest))other.webContents.loadURL(dest).catch(()=>{});}
        if(recording?.w===w){recording.steps.push({type:'navigate',url:core.safeUrl(dest)});recording.steps=recording.steps.slice(0,30);}
        emit();
      });
      w.on('did-finish-load',()=>{if(recording?.w===w)exec(w,scripts.RECORD_START).catch(()=>{});});
      win.contentView.addChildView(v);return v;
    });
    resize();await Promise.allSettled(previews.map(v=>v.webContents.loadURL(url)));emit();return state();
  }
  async function drain(){if(!recording||recordBusy)return;const r=recording;recordBusy=true;try{const values=await exec(r.w,scripts.RECORD_DRAIN);if(recording===r)r.steps=core.steps([...r.steps,...(Array.isArray(values)?values:[])]);}catch{}finally{recordBusy=false;}}
  function stopRecording(){if(recording){const r=recording;recording=null;if(!r.w.isDestroyed())exec(r.w,scripts.RECORD_STOP).catch(()=>{});return r;}return null;}
  function confirm(message,detail){return dialog.showMessageBoxSync(win,{type:'question',message,detail,buttons:['Cancelar','Continuar'],defaultId:0,cancelId:0,noLink:true})===1;}
  async function screenshot(){const w=usable();const image=await w.capturePage();if(image.isEmpty())throw Error('A página não gerou uma imagem.');return{image:image.resize({width:Math.min(1400,image.getSize().width)}).toDataURL(),url:core.safeUrl(w.getURL()),at:new Date().toISOString(),size:image.getSize()};}
  const actions={
    state:()=>state(),
    close:()=>{if(enabled)toggle();return true;},
    devtools:()=>{toggleDevTools(usable());return true;},
    async preview(v){if(!['responsive','accounts'].includes(v.mode))throw Error('Modo inválido.');return makePreviews(v.mode,v.url);},
    page:()=>{closePreviews();resize();emit();return state();},
    select:v=>{selected=Math.max(0,Math.min(previews.length-1,Number(v.index)||0));previews[selected]?.webContents.focus();emit();return state();},
    sync:v=>{sync=!!v.enabled&&mode==='responsive';emit();return state();},
    async network(v){if(!previews.length)throw Error('Abra Telas ou Contas para isolar a simulação da navegação normal.');const s=usable().session;if(!['online','slow','offline'].includes(v.mode))throw Error('Condição inválida.');if(v.mode==='online')s.disableNetworkEmulation();else s.enableNetworkEmulation(v.mode==='offline'?{offline:true}:{offline:false,latency:350,downloadThroughput:64000,uploadThroughput:32000});network[selected]=v.mode;emit();return state();},
    async clearSession(){if(!previews.length)throw Error('Use um ambiente de teste.');if(!confirm('Sair das contas deste ambiente?','Cookies, cache e armazenamento do ambiente selecionado serão removidos.'))return false;const w=usable();await w.session.clearStorageData();await w.session.clearCache();w.reload();return true;},
    reload:()=>{usable().reload();return true;},
    audit:async()=>exec(usable(),scripts.AUDIT),
    inspect:v=>{const w=usable();w.inspectElement(Math.max(0,Math.round(Number(v.x)||0)),Math.max(0,Math.round(Number(v.y)||0)));return true;},
    clearEvents:()=>{events=[];emit();return true;},
    async capture(v){const shot=await screenshot();if(v.slot==='before')before=shot;else after=shot;return{before,after};},
    async report(v){return{version:app.getVersion(),url:core.safeUrl(usable().getURL()),createdAt:new Date().toISOString(),title:core.text(v.title,120),steps:core.text(v.steps,6000),expected:core.text(v.expected,2000),actual:core.text(v.actual,2000),events:v.logs?events:[],screenshot:v.screenshot?(await screenshot()).image:null};},
    async export(v){const content=core.text(v.content,12000000);const result=await dialog.showSaveDialog(win,{title:'Salvar relato revisado',defaultPath:'happy-coding-relato.json',filters:[{name:'JSON',extensions:['json']}]});if(result.canceled||!result.filePath)return false;fs.writeFileSync(result.filePath,content,{mode:0o600});return true;},
    copy:v=>{clipboard.writeText(core.text(v.text,20000));return true;},
    open:v=>{const url=core.target(v.url);if(!url)throw Error('Endereço inválido.');openUrl(url);return true;},
    saveProject:v=>{const p=core.project(v.project);const index=data.projects.findIndex(x=>x.id===p.id);if(index<0){if(data.projects.length>=100)throw Error('Limite de 100 projetos.');data.projects.push(p);}else data.projects[index]=p;save();emit();return p;},
    removeProject:v=>{if(!confirm('Remover esta configuração de testes?','Os arquivos do projeto permanecem no computador.'))return false;data.projects=data.projects.filter(p=>p.id!==v.id);save();emit();return true;},
    async health(v){const url=core.target(v.url);if(!url||!core.isLocal(url))throw Error('Informe um endereço localhost.');try{const r=await apiSession.fetch(url,{method:'HEAD',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(4000)});await r.body?.cancel();return{online:true,status:r.status};}catch{return{online:false};}},
    async api(v){
      const url=core.target(v.url);if(!url)throw Error('URL inválida.');
      const method=String(v.method||'GET');if(!['GET','HEAD','POST','PUT','PATCH','DELETE'].includes(method))throw Error('Método inválido.');
      if(!['GET','HEAD'].includes(method)&&!confirm(`Enviar ${method} para ${new URL(url).origin}?`,'Esta requisição pode alterar dados no servidor. Verifique o endereço e o corpo antes de continuar.'))return null;
      const headers={'Accept':'application/json'};
      if(v.token)headers.Authorization=`Bearer ${core.text(v.token,4096)}`;
      if(!['GET','HEAD'].includes(method))headers['Content-Type']='application/json';
      const start=Date.now();const r=await apiSession.fetch(url,{method,headers,body:['GET','HEAD'].includes(method)?undefined:core.text(v.body,100000),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
      const reader=r.body?.getReader();let size=0,chunks=[];if(reader){try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024*1024){await reader.cancel();throw Error('Resposta excede 1 MB.');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}}
      return{status:r.status,ms:Date.now()-start,body:Buffer.concat(chunks).toString('utf8'),type:r.headers.get('content-type')||''};
    },
    async record(){if(!previews.length)throw Error('Abra um ambiente Telas ou Contas para gravar.');const w=usable();if(!core.isLocal(w.getURL()))throw Error('A gravação e repetição desta versão são limitadas a localhost.');if(recording)throw Error('Já existe uma gravação.');recording={w,url:w.getURL(),steps:[]};await exec(w,scripts.RECORD_START);emit();return true;},
    async stop(v){await drain();const r=stopRecording();if(!r)return null;const test={name:core.text(v.name,80)||'Teste local',url:r.url,steps:core.steps(r.steps)};data.tests.unshift(test);data.tests=data.tests.slice(0,100);save();emit();return test;},
    assert:v=>{if(!recording)throw Error('Inicie uma gravação.');if(!v.selector||!v.expected)throw Error('Informe seletor e texto esperado.');recording.steps=core.steps([...recording.steps,{type:'assert',selector:v.selector,expected:v.expected}]);emit();return true;},
    async replay(v){
      if(recording)throw Error('Pare a gravação antes de repetir.');
      const t=data.tests[Number(v.index)];if(!t||!core.isLocal(t.url))throw Error('Teste local inválido.');
      if(!confirm('Repetir este teste em localhost?',`Cada clique pedirá confirmação. O projeto pode alterar dados ou chamar serviços externos. Teste: ${t.name}`))return null;
      await makePreviews('accounts',t.url);const w=usable(),origin=new URL(t.url).origin,results=[];
      for(const step of t.steps){
        if(w.isDestroyed())throw Error('Ambiente fechado.');
        if(new URL(w.getURL()).origin!==origin)throw Error('Teste interrompido: a página saiu da origem local.');
        if(step.type==='navigate'){if(new URL(step.url).origin!==origin)throw Error('Destino fora da origem local.');await w.loadURL(step.url);results.push({step,passed:true});}
        else {if(step.type==='click'&&!confirm('Executar este clique?',`${step.selector}\nOrigem: ${origin}\nPode enviar formulários ou alterar dados.`)){results.push({step,passed:false,cancelled:true});break;}const passed=await exec(w,scripts.action(step));results.push({step,passed:!!passed});if(!passed)break;}
      }return results;
    },
    play:v=>{if(v.start){playStarted=Date.now();elapsed=0;}else{elapsed=playStarted?Date.now()-playStarted:elapsed;playStarted=0;}emit();return state();},
    mark:v=>{log('playtest',`${Math.round((playStarted?Date.now()-playStarted:elapsed)/1000)}s — ${core.text(v.message,300)}`);return state();}
  };
  ipcMain.handle('hc:developer',async(event,action,value={})=>{
    if(!core.authorized(event,panel,panelUrl))throw Error('Acesso negado.');
    if(!Object.hasOwn(actions,action))throw Error('Ação desconhecida.');
    if(action==='state')return{ok:true,value:state()};
    if(busy&&action!=='state')return{ok:false,error:'Aguarde a operação atual.'};
    busy=true;try{return{ok:true,value:await actions[action](value||{})};}catch(e){return{ok:false,error:core.text(e.message,300)};}finally{busy=false;}
  });
  const timer=setInterval(async()=>{
    if(destroyed)return;
    await drain();
    if(!sync||syncBusy||!previews.length)return;syncBusy=true;
    try{const w=wc();const pos=await exec(w,scripts.SCROLL);await Promise.allSettled(previews.filter(v=>v.webContents!==w).map(v=>exec(v.webContents,scripts.scrollToRatio(pos.x,pos.y))));}catch{}finally{syncBusy=false;}
  },500);timer.unref?.();
  return{toggle,layout,attach,devtools:toggleDevTools,changed:()=>{if(enabled){resize();emit();}},close:()=>{destroyed=true;clearInterval(timer);closePreviews();ipcMain.removeHandler('hc:developer');if(panel&&!panel.webContents.isDestroyed())panel.webContents.close();for(const s of ownedSessions){s.disableNetworkEmulation();s.closeAllConnections().catch(()=>{});s.clearStorageData().catch(()=>{});}panel=null;enabled=false;}};
}
module.exports={createDeveloperService};
