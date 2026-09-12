'use strict';
// Real Electron integration test. Only a local fixture; no user account or production API.
const {app,BaseWindow,WebContentsView}=require('electron');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {once}=require('node:events');
const {createDeveloperService}=require('./developer-service');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hc-dev-smoke-'));
app.setPath('userData',dir);app.enableSandbox();app.disableHardwareAcceleration();
const progress=message=>{fs.appendFileSync(path.join(__dirname,'developer-smoke.log'),message+'\n');};
let win,service,server;
const watchdog=setTimeout(()=>{console.error('Developer smoke timeout');app.exit(1);},90000);
async function run(){
  await app.whenReady();
  server=http.createServer((req,res)=>{if(req.url==='/api'){res.setHeader('Content-Type','application/json');res.end('{"healthy":true}');return;}res.end('<!doctype html><title>Developer fixture</title><style>body{background:white;color:black}#low{color:#aaa}</style><h1>Fixture</h1><input id="unlabelled"><input type="password" id="password"><p id="low">Low contrast</p><button id="click">Count</button><p id="result">0</p><script>document.querySelector("#click").onclick=()=>document.querySelector("#result").textContent="1";</script>');});
  server.listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${server.address().port}/`;
  progress('Local fixture ready');
  win=new BaseWindow({width:1440,height:900,show:true});
  const original=new WebContentsView({webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});win.contentView.addChildView(original);await original.webContents.loadURL(url);
  const tab={view:original};service=createDeveloperService({win,currentTab:()=>tab,getTabs:()=>[tab],top:()=>100,resize:()=>service.layout(),notice:()=>{},openUrl:()=>{},userData:dir,trace:progress});service.attach(original.webContents);service.toggle();
  const panel=win.contentView.children.find(v=>v!==original);await once(panel.webContents,'did-finish-load');progress('Panel loaded');
  const invoke=(action,value={})=>panel.webContents.executeJavaScript(`window.happyDeveloper.call(${JSON.stringify(action)},${JSON.stringify(value)})`);
  assert.equal(await original.webContents.executeJavaScript('typeof window.happyDeveloper'),'undefined');
  await invoke('preview',{mode:'responsive',url});
  progress('Three previews loaded');
  const views=win.contentView.children.filter(v=>v!==original&&v!==panel);
  assert.equal(views.length,3);assert.equal(new Set(views.map(v=>v.webContents.session)).size,3);assert.ok(views.every(v=>v.webContents.session!==original.webContents.session));
  const width=await views[0].webContents.executeJavaScript('innerWidth');progress(`Emulated width: ${width}`);assert.equal(width,390);
  const audit=await invoke('audit');progress(`Audit: ${JSON.stringify(audit)}`);assert.ok(audit.issues.some(i=>i.kind==='acessibilidade'));assert.ok(audit.issues.some(i=>i.kind==='contraste'));
  const shot=await invoke('capture',{slot:'before'});assert.ok(shot.before.image.startsWith('data:image/png;base64,'));
  progress('Screenshot captured');
  await invoke('network',{mode:'offline'});assert.equal((await invoke('state')).network,'offline');
  await invoke('network',{mode:'online'});
  const api=await invoke('api',{method:'GET',url:url+'api'});assert.equal(api.status,200);assert.equal(JSON.parse(api.body).healthy,true);
  progress('Network controls and local API passed');
  await invoke('saveProject',{project:{name:'Smoke',url,version:'fixture'}});assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'developer-projects.json'),'utf8')).projects[0].name,'Smoke');
  await invoke('record');await invoke('assert',{selector:'#result',expected:'0'});await invoke('stop',{name:'Fixture expectation'});assert.equal((await invoke('state')).tests.length,1);
  progress('Persistence and recording passed');
  const report=await invoke('report',{title:'Fixture',logs:false,screenshot:false});assert.deepEqual(report.events,[]);assert.equal(report.screenshot,null);
  await invoke('page');assert.equal(win.contentView.children.length,2);assert.equal(original.getVisible(),true);
  await invoke('close');assert.equal((await invoke('state')).enabled,false);
  progress('PASS: real Electron developer smoke');
  console.log('PASS: real Electron developer panel, sandbox isolation, three sessions, emulation, audit, capture, network controls, local API, persistence and report opt-in');
}
run().then(()=>finish(0)).catch(e=>{progress(e.stack||String(e));console.error(e);finish(1);});
function finish(code){clearTimeout(watchdog);try{service?.close();for(const v of win?.contentView.children||[])if(!v.webContents?.isDestroyed())v.webContents?.close();win?.destroy();server?.close();}catch{}app.exit(code);}
