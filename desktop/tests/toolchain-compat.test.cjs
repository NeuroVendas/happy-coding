'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const desktop=path.resolve(__dirname,'..');
const compat=require('../patch-forge-packager20.js');

const LEGACY_SOURCE=`function hidePromiseFromPromisify(fn) {
  return (...args) => {
    void fn(...args);
  };
}`;

function buildBridge(){
  const patched=compat.patchSource(LEGACY_SOURCE);
  assert.equal(patched.changed,true);
  return vm.runInNewContext(`${patched.source}; hidePromiseFromPromisify`);
}

test('reviewed Forge and Packager versions are installed and the postinstall patch is present',()=>{
  const forgeRoot=compat.findPackageRoot('@electron-forge/core',[desktop]);
  const packagerRoot=compat.findPackageRoot('@electron/packager',[forgeRoot,desktop]);
  const forgePkg=JSON.parse(fs.readFileSync(path.join(forgeRoot,'package.json'),'utf8'));
  const packagerPkg=JSON.parse(fs.readFileSync(path.join(packagerRoot,'package.json'),'utf8'));
  const installedForgeSource=fs.readFileSync(path.join(forgeRoot,'dist','api','package.js'),'utf8');

  assert.equal(forgePkg.version,compat.EXPECTED_FORGE);
  assert.equal(packagerPkg.version,compat.EXPECTED_PACKAGER);
  assert.match(installedForgeSource,new RegExp(compat.MARKER));
});

test('compatibility patch is idempotent and refuses unknown Forge source',()=>{
  const first=compat.patchSource(LEGACY_SOURCE);
  assert.equal(first.changed,true);
  assert.match(first.source,new RegExp(compat.MARKER));

  const second=compat.patchSource(first.source);
  assert.equal(second.changed,false);
  assert.equal(second.source,first.source);

  assert.throws(
    ()=>compat.patchSource('function hidePromiseFromPromisify(fn) { return fn; }'),
    /Refusing to patch unknown code/
  );
});

test('Packager 20 hook object is adapted back to the reviewed Forge callback signature',async()=>{
  const bridge=buildBridge();
  let seen=null;
  const wrapped=bridge((buildPath,electronVersion,platform,arch,done)=>{
    seen=[buildPath,electronVersion,platform,arch];
    done();
  });

  await wrapped({
    buildPath:'C:/HappyCoding/app',
    electronVersion:'44.2.0',
    platform:'win32',
    arch:'x64'
  });

  assert.deepEqual(seen,['C:/HappyCoding/app','44.2.0','win32','x64']);
});

test('nested Forge promisify callback invocation remains supported explicitly',async()=>{
  const bridge=buildBridge();
  let seen=null;
  const wrapped=bridge((buildPath,electronVersion,platform,arch,done)=>{
    seen=[buildPath,electronVersion,platform,arch];
    done();
  });

  await new Promise((resolve,reject)=>{
    wrapped('C:/HappyCoding/app','44.2.0','win32','x64',error=>error?reject(error):resolve());
  });

  assert.deepEqual(seen,['C:/HappyCoding/app','44.2.0','win32','x64']);
});

test('finalized target arrays and callback errors preserve Promise semantics',async()=>{
  const bridge=buildBridge();
  const targets=[{platform:'win32',arch:'x64'}];
  let seen=null;
  const finalize=bridge((value,done)=>{
    seen=value;
    done();
  });
  await finalize(targets);
  assert.equal(seen,targets);

  const failing=bridge((buildPath,electronVersion,platform,arch,done)=>{
    done(new Error('compat failure'));
  });
  await assert.rejects(
    failing({buildPath:'C:/app',electronVersion:'44.2.0',platform:'win32',arch:'x64'}),
    /compat failure/
  );
});

test('unexpected hook shapes still fail closed instead of invoking legacy callbacks',()=>{
  const bridge=buildBridge();
  let invoked=false;
  const wrapped=bridge(()=>{invoked=true;});

  for(const args of [
    [{platform:'win32',arch:'x64'}],
    ['C:/app','44.2.0','win32','x64'],
    ['C:/app','44.2.0','win32','x64','not-a-callback']
  ]){
    assert.throws(()=>wrapped(...args),/Unexpected Packager 20 hook arguments/);
  }
  assert.equal(invoked,false);
});
