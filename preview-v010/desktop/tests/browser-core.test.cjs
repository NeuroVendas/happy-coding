'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {HOME,SEARCH,MAX_INPUT,resolveInput,safeTarget,cleanTitle,nextTabId}=require('../browser-core');

test('home aliases resolve to Happy Coding',()=>{assert.equal(safeTarget(''),HOME);assert.equal(safeTarget('happy://home'),HOME);});
test('host-like input becomes HTTPS navigation',()=>{assert.equal(safeTarget('example.com'),'https://example.com/');assert.equal(safeTarget('docs.example.com/path'),'https://docs.example.com/path');});
test('HTTP input is upgraded to HTTPS',()=>{assert.equal(safeTarget('http://example.com/a?b=1'),'https://example.com/a?b=1');});
test('HTTPS input remains HTTPS',()=>{assert.equal(safeTarget('https://example.com/test'),'https://example.com/test');});
test('plain text is classified as an internal search while legacy safeTarget keeps SafeSearch fallback',()=>{assert.deepEqual(resolveInput('electron tabs'),{kind:'search',query:'electron tabs'});assert.equal(safeTarget('electron tabs'),`${SEARCH}electron%20tabs`);});
test('happy search alias round-trips to a search query',()=>{assert.deepEqual(resolveInput('happy://search?q=electron%20tabs'),{kind:'search',query:'electron tabs'});});
test('dangerous or unsupported schemes are searched instead of loaded',()=>{for(const value of ['javascript:alert(1)','data:text/html,hi','file:///C:/Windows','ftp://example.com/a'])assert.equal(resolveInput(value).kind,'search',value);});
test('input is bounded before navigation parsing',()=>{const huge='x'.repeat(MAX_INPUT+500);assert.equal(resolveInput(huge).query.length,MAX_INPUT);});
test('titles are normalized and bounded',()=>{assert.equal(cleanTitle('  Hello\n  World  '),'Hello World');assert.equal(cleanTitle(''),'Nova aba');assert.equal(cleanTitle('x'.repeat(100)).length,80);});
test('tab cycling wraps in both directions',()=>{const ids=['a','b','c'];assert.equal(nextTabId(ids,'c',1),'a');assert.equal(nextTabId(ids,'a',-1),'c');assert.equal(nextTabId([],null,1),null);});
