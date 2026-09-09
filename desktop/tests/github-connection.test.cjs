'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {GitHubConnection}=require('../github-connection');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(t,request,overrides={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hc-github-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const safeStorage={isEncryptionAvailable:()=>true,encryptString:()=>Buffer.from('encrypted-by-test-os'),decryptString:()=> 'test-token'};
  return new GitHubConnection({clientId:'public-client-id',vaultPath:path.join(dir,'vault'),safeStorage,request,wait:async()=>{},...overrides});
}
const response=value=>({ok:true,status:200,json:async()=>value});
test('device flow handles pending and slow_down, encrypts token, never exposes it to renderer',async t=>{
  const intervals=[],requests=[];const responses=[{device_code:'private-device-code',user_code:'ABCD-1234',verification_uri:'https://github.com/login/device',expires_in:900,interval:5},{error:'authorization_pending'},{error:'slow_down'},{access_token:'test-token'},{login:'developer'},[{full_name:'developer/game',html_url:'https://github.com/developer/game',private:false}]];
  const c=setup(t,async(url,options)=>{requests.push({url,options});return response(responses.shift());},{wait:async ms=>{intervals.push(ms);}});
  const result=await c.start();for(let n=0;n<15&&!c.state().connected;n++)await tick();
  assert.equal(result.userCode,'ABCD-1234');assert.ok(!JSON.stringify(result).includes('private-device-code'));
  assert.deepEqual(intervals,[5000,5000,10000]);assert.equal(c.state().login,'developer');assert.ok(!JSON.stringify(c.state()).includes('test-token'));
  assert.equal(fs.readFileSync(c.vaultPath,'utf8'),'encrypted-by-test-os');
  assert.equal(new URLSearchParams(requests[0].options.body).get('scope'),'read:user');
  assert.ok(requests.every(r=>r.options.redirect==='error'));
  const repos=await c.repositories();assert.equal(repos[0].name,'developer/game');
  c.forget();assert.equal(fs.existsSync(c.vaultPath),false);assert.equal(c.state().connected,false);
});
test('encryption unavailable and missing configuration fail before any authorization request',async t=>{
  const c=setup(t,()=>{throw Error('network should not be called');});c.clientId='';await assert.rejects(c.start(),/registro/);
  c.clientId='id';c.safeStorage.isEncryptionAvailable=()=>false;await assert.rejects(c.start(),/protegido/);
  c.safeStorage.isEncryptionAvailable=()=>true;c.safeStorage.getSelectedStorageBackend=()=> 'basic_text';await assert.rejects(c.start(),/protegido/);
});
test('cancelled flow cannot save a token returned by an already pending request',async t=>{
  let finish,requests=0;const c=setup(t,async()=>{if(++requests===1)return response({device_code:'secret',user_code:'code',verification_uri:'https://github.com/login/device'});return new Promise(resolve=>{finish=resolve;});});
  await c.start();await tick();c.cancel();finish(response({access_token:'late-token'}));await tick();
  assert.equal(c.state().connected,false);assert.equal(fs.existsSync(c.vaultPath),false);
});
test('unexpected verification destinations are rejected',async t=>{
  const c=setup(t,async()=>response({device_code:'x',user_code:'y',verification_uri:'https://evil.example'}));
  await assert.rejects(c.start(),/Device Flow/);assert.equal(c.state().pending,false);
});
test('expired authorization clears the saved token and requests reconnection',async t=>{
  const c=setup(t,async()=>({ok:false,status:401}));
  c.token='expired-test-token';c.profile={login:'developer'};
  fs.writeFileSync(c.vaultPath,'encrypted-by-test-os');
  await assert.rejects(c.repositories(),/expirou.*novamente/);
  assert.equal(c.state().connected,false);
  assert.equal(c.token,null);
  assert.equal(fs.existsSync(c.vaultPath),false);
});
