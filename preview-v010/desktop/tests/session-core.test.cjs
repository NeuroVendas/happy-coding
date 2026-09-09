const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MAX_RESTORE_TABS,cleanSessionUrl,normalizeSession,buildSessionSnapshot}=require('../session-core');

test('session URLs allow HTTPS only',()=>{assert.equal(cleanSessionUrl('https://example.com/a'),'https://example.com/a');assert.equal(cleanSessionUrl('http://example.com'),null);assert.equal(cleanSessionUrl('file:///C:/x'),null);});
test('unclean previous exit disables automatic restore',()=>{assert.deepEqual(normalizeSession({cleanExit:false,tabs:['https://example.com/'],activeIndex:0}),{restore:false,urls:[],activeIndex:0});});
test('clean session restores valid URLs and clamps active index',()=>{const out=normalizeSession({cleanExit:true,tabs:['file:///x','https://a.example/','https://b.example/'],activeIndex:99});assert.equal(out.restore,true);assert.deepEqual(out.urls,['https://a.example/','https://b.example/']);assert.equal(out.activeIndex,1);});
test('restore is limited to bounded tab count',()=>{const tabs=Array.from({length:MAX_RESTORE_TABS+5},(_,i)=>`https://${i}.example/`);const out=normalizeSession({cleanExit:true,tabs,activeIndex:0});assert.equal(out.urls.length,MAX_RESTORE_TABS);});
test('snapshot drops unsafe URLs and records clean exit state',()=>{const out=buildSessionSnapshot(['javascript:1','https://ok.example/'],0,true);assert.deepEqual(out.tabs,['https://ok.example/']);assert.equal(out.cleanExit,true);assert.equal(out.activeIndex,0);assert.ok(out.savedAt>0);});
