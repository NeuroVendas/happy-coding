'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');
const {pathToFileURL}=require('node:url');

test('native workspace rejects remote/subframe callers and launches only dialog-selected Godot without shell',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hc-workspace-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const desktop=path.resolve(__dirname,'..'),entry=pathToFileURL(path.join(desktop,'workspaces.html')).href;
  let handler,currentWindow,selection=[],confirmation=0,spawnArgs;
  class FakeWindow extends EventEmitter{
    constructor(options){super();this.options=options;currentWindow=this;this.webContents=new EventEmitter();Object.assign(this.webContents,{mainFrame:{url:entry},send:()=>{},setWindowOpenHandler:()=>{}});}
    isDestroyed(){return false;}loadFile(){}show(){}focus(){}close(){this.emit('closed');}
  }
  const electron={BrowserWindow:FakeWindow,dialog:{showOpenDialog:async()=>({canceled:!selection.length,filePaths:selection}),showMessageBox:async()=>({response:confirmation}),showMessageBoxSync:()=>0},ipcMain:{handle:(_name,fn)=>{handler=fn;}},safeStorage:{isEncryptionAvailable:()=>false},shell:{openExternal:async()=>{}}};
  const mod={exports:{}};
  const req=name=>name==='electron'?electron:name==='node:child_process'?{spawn:(...args)=>{spawnArgs=args;const child=new EventEmitter();child.unref=()=>{};process.nextTick(()=>child.emit('spawn'));return child;}}:name.startsWith('./')?require(path.join(desktop,name)):require(name);
  const wrapper=vm.runInThisContext(`(function(require,module,exports,__dirname){${fs.readFileSync(path.join(desktop,'workspace-service.js'),'utf8')}\n})`);wrapper(req,mod,mod.exports,desktop);
  const service=mod.exports.createWorkspaceService({userData:dir,getTabs:()=>[],openUrl:()=>{}});service.open();
  assert.equal(currentWindow.options.webPreferences.sandbox,true);assert.equal(currentWindow.options.webPreferences.nodeIntegration,false);
  const event={sender:currentWindow.webContents,senderFrame:currentWindow.webContents.mainFrame};
  assert.equal((await handler({sender:{},senderFrame:{url:entry}},'create',{name:'bad'})).ok,false);
  assert.equal((await handler({...event,senderFrame:{url:entry}},'create',{name:'iframe'})).ok,false);
  let r=await handler(event,'create',{name:'Game'});assert.equal(r.ok,true);const id=r.data.projects[0].id;
  await handler(event,'save',{id,name:'Game',godotProject:'/etc/passwd',links:['javascript:alert(1)']});
  assert.equal((await handler(event,'state')).data.projects[0].godotProject,'');
  assert.equal((await handler(event,'launch',{id})).ok,false);assert.equal(spawnArgs,undefined);
  const exe=path.join(dir,'Godot test.exe'),project=path.join(dir,'project.godot');fs.writeFileSync(exe,'fixture');fs.writeFileSync(project,'config_version=5');
  selection=[exe];assert.equal((await handler(event,'chooseGodot')).ok,true);
  selection=[project];assert.equal((await handler(event,'chooseProject',{id})).ok,true);
  assert.equal((await handler(event,'launch',{id})).data,false);assert.equal(spawnArgs,undefined);
  confirmation=1;assert.equal((await handler(event,'launch',{id})).data,true);
  assert.equal(spawnArgs[0],exe);assert.deepEqual(spawnArgs[1],['--editor','--path',dir]);assert.equal(spawnArgs[2].shell,false);
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'dev-workspaces.json'),'utf8'));assert.equal(saved.projects[0].godotProject,project);
  service.close();
});
