'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../developer-core');
test('developer targets permit local HTTP only, reject credentials and unsafe protocols',()=>{
  assert.equal(core.target('localhost:3000'),'http://localhost:3000/');
  assert.equal(core.target('http://127.0.0.1:8080/a'),'http://127.0.0.1:8080/a');
  assert.equal(core.target('http://[::1]:8080/'),'http://[::1]:8080/');
  for(const url of ['http://example.com','file:///etc/passwd','javascript:alert(1)','https://a:b@example.com','http://localhost.evil.test','http://192.168.1.1','https://xvideos.com'])assert.equal(core.target(url),null,url);
  assert.equal(new URL(core.target('https://www.google.com/search?q=test&safe=off')).searchParams.get('safe'),'active');
});
test('project persistence bounds input and rejects invalid or privileged fields',()=>{
  const p=core.project({name:'a'.repeat(300),url:'http://localhost:3000',token:'secret',path:'/etc/passwd',references:[{url:'javascript:bad()'},{url:'https://docs.example.com',title:'Docs'}]});
  assert.equal(p.name.length,80);assert.equal(p.references.length,1);assert.equal(p.token,undefined);assert.equal(p.path,undefined);
  assert.equal(core.normalize({projects:Array(200).fill(p)}).projects.length,100);
  assert.equal(core.normalize({projects:[{url:'file:///tmp/a'}]}).projects.length,0);
});
test('test steps never persist typed passwords or arbitrary JavaScript',()=>{
  const steps=core.steps([{type:'input',value:'password'},{type:'execute',code:'steal()'},{type:'navigate',url:'file:///tmp/a'},{type:'click',selector:'#go',value:'secret'},{type:'assert',selector:'#result',expected:'Success'}]);
  assert.deepEqual(steps,[{type:'click',selector:'#go'},{type:'assert',selector:'#result',expected:'Success'}]);
});
test('privileged developer IPC requires exact local main frame',()=>{
  const url='file:///developer.html',panel={webContents:{mainFrame:{url}}},event={sender:panel.webContents,senderFrame:panel.webContents.mainFrame};
  assert.equal(core.authorized(event,panel,url),true);
  assert.equal(core.authorized({...event,sender:{}},panel,url),false);
  assert.equal(core.authorized({...event,senderFrame:{url}},panel,url),false);
  panel.webContents.mainFrame.url='https://attacker.example';assert.equal(core.authorized(event,panel,url),false);
});
test('report URLs remove query and fragment and logs redact common credentials',()=>{
  assert.equal(core.safeUrl('https://test.example/a?access_token=secret#password'),'https://test.example/a');
  const text=core.redact('Bearer abc.def password=secret https://a.test/?q=private&token=abc');
  for(const secret of ['abc.def','secret','private'])assert.equal(text.includes(secret),false);
});
