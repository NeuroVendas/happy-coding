'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const desktop=path.resolve(__dirname,'..');
const bootstrap=fs.readFileSync(path.join(desktop,'bootstrap.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(desktop,'package.json'),'utf8'));

test('v0.10.1 applies the branded ICO to runtime Windows windows',()=>{
  assert.equal(pkg.version,'0.10.1');
  assert.match(bootstrap,/assets','happy-coding\.ico'/);
  assert.match(bootstrap,/BaseWindow\.getAllWindows\(\)/);
  assert.match(bootstrap,/\.setIcon\(BRAND_ICON\)/);
});
