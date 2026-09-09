'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');

const desktop=resolve(__dirname,'..');
const bootstrap=readFileSync(resolve(desktop,'bootstrap.js'),'utf8');
const pkg=JSON.parse(readFileSync(resolve(desktop,'package.json'),'utf8'));
const workflow=readFileSync(resolve(desktop,'..','.github','workflows','desktop-windows.yml'),'utf8');

test('packaged Windows app points autoUpdater at the public Happy Coding release feed',()=>{
  assert.match(bootstrap,/app\.isPackaged/);
  assert.match(bootstrap,/process\.platform!=='win32'/);
  assert.match(bootstrap,/update\.electronjs\.org\/\$\{UPDATE_REPO\}\/\$\{process\.platform\}-\$\{process\.arch\}\/\$\{app\.getVersion\(\)\}/);
  assert.match(bootstrap,/autoUpdater\.checkForUpdates\(\)/);
  assert.match(bootstrap,/autoUpdater\.quitAndInstall\(\)/);
});

test('Squirrel lifecycle is handled before the normal browser starts',()=>{
  assert.match(bootstrap,/electron-squirrel-startup/);
  assert.match(bootstrap,/if\(squirrelStartup\)/);
  assert.match(bootstrap,/com\.squirrel\.happy_coding\.HappyCoding/);
});

test('package enters through updater bootstrap and carries Squirrel runtime support',()=>{
  assert.equal(pkg.main,'bootstrap.js');
  assert.equal(pkg.repository?.url,'https://github.com/NeuroVendas/happy-coding.git');
  assert.ok(pkg.dependencies?.['electron-squirrel-startup']);
});

test('Windows workflow can publish the exact Squirrel assets required for updates',()=>{
  assert.match(workflow,/contents: write/);
  assert.match(workflow,/HappyCoding-Setup\.exe/);
  assert.match(workflow,/full\.nupkg/);
  assert.match(workflow,/RELEASES/);
  assert.match(workflow,/gh release create/);
});

test('official Windows release must smoke the packaged browser before publication',()=>{
  assert.match(workflow,/Smoke packaged browser startup before release/);
  assert.match(workflow,/Start-Process -FilePath \$exe\.FullName/);
  assert.match(workflow,/Start-Sleep -Seconds 8/);
  const smoke=workflow.indexOf('Smoke packaged browser startup before release');
  const release=workflow.indexOf('Publish GitHub Release for auto-update');
  assert.ok(smoke>=0&&release>smoke,'startup smoke must run before release publication');
});
