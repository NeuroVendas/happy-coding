'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');
const {pathToFileURL}=require('node:url');
test('developer service isolates environments, authenticates callers and restores page visibility on exit',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hc-dev-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const root=path.resolve(__dirname,'..');let handle,id=0;const sessions=[],views=[];
  function makeSession(){const s={setPermissionRequestHandler(fn){this.permission=fn;},setPermissionCheckHandler(fn){this.check=fn;},on(){},webRequest:{onBeforeRequest(fn){this.filter=fn;},onErrorOccurred(){},onCompleted(){}},disableNetworkEmulation(){this.network='online';},enableNetworkEmulation(opts){this.network=opts;},closeAllConnections:async()=>{},clearStorageData:async()=>{},clearCache:async()=>{}};sessions.push(s);return s;}
  class View{
    constructor(options){this.options=options;this.visible=true;this.webContents=new EventEmitter();const w=this.webContents;w.id=++id;w.session=options.webPreferences.session||makeSession();w.mainFrame={url:''};Object.assign(w,{isDestroyed:()=>!!w.dead,getURL:()=>w.mainFrame.url,setWindowOpenHandler:()=>{},loadURL:async url=>{w.mainFrame.url=url;},loadFile:p=>{w.mainFrame.url=pathToFileURL(p).href;},close:()=>{w.dead=true;},send:()=>{},focus:()=>{},enableDeviceEmulation:()=>{},executeJavaScriptInIsolatedWorld:async()=>[]});views.push(this);}
    setVisible(v){this.visible=v;}setBounds(b){this.bounds=b;}
  }
  const electron={WebContentsView:View,session:{fromPartition:makeSession},ipcMain:{handle:(_name,fn)=>{handle=fn;},removeHandler(){}},dialog:{showMessageBoxSync:()=>0},Menu:{buildFromTemplate:()=>({popup(){}})},clipboard:{writeText(){}},app:{getVersion:()=> '0.11.0'}};
  const mod={exports:{}},req=name=>name==='electron'?electron:name.startsWith('./')?require(path.join(root,name)):require(name);
  vm.runInThisContext(`(function(require,module,exports,__dirname){${fs.readFileSync(path.join(root,'developer-service.js'),'utf8')}\n})`)(req,mod,mod.exports,root);
  const children=[],win={contentView:{addChildView:v=>children.push(v),removeChildView:v=>children.splice(children.indexOf(v),1)},isDestroyed:()=>false,getContentBounds:()=>({width:1200,height:800})};
  const original=new View({webPreferences:{}});original.webContents.mainFrame.url='https://example.com';children.push(original);const tab={view:original};let service;
  service=mod.exports.createDeveloperService({win,currentTab:()=>tab,getTabs:()=>[tab],top:()=>100,resize:()=>service.layout(),notice(){},openUrl(){},userData:dir});t.after(()=>service.close());
  service.toggle();const panel=children.find(v=>v!==original),event={sender:panel.webContents,senderFrame:panel.webContents.mainFrame};
  await assert.rejects(handle({sender:original.webContents,senderFrame:original.webContents.mainFrame},'state'),/negado/);
  await assert.rejects(handle({...event,senderFrame:{url:panel.webContents.mainFrame.url}},'state'),/negado/);
  await assert.rejects(handle(event,'constructor'),/desconhecida/);
  assert.equal((await handle(event,'network',{mode:'offline'})).ok,false);
  assert.equal((await handle(event,'preview',{mode:'accounts',url:'http://localhost:3000'})).ok,true);
  const previews=children.filter(v=>v!==original&&v!==panel);assert.equal(previews.length,3);assert.equal(original.visible,false);assert.equal(new Set(previews.map(v=>v.webContents.session)).size,3);
  for(const v of previews){assert.equal(v.options.webPreferences.preload,undefined);assert.equal(v.options.webPreferences.sandbox,true);assert.equal(v.options.webPreferences.nodeIntegration,false);assert.equal(v.webContents.session.check(),false);}
  await handle(event,'network',{mode:'offline'});assert.equal(previews[0].webContents.session.network.offline,true);assert.equal(original.webContents.session.network,undefined);
  await handle(event,'close');assert.equal(original.visible,true);assert.equal(panel.visible,false);assert.ok(previews.every(v=>v.webContents.dead));
  assert.equal(previews[0].webContents.session.network,'online');
});
