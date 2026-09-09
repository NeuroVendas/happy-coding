'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');

const root=resolve(__dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const scripts=['app.js','community.js','browser-controls.js','account-entry.js','safety-ui.js','account-sync.js','sync-hook.js']
  .map(file=>readFileSync(resolve(root,file),'utf8'));

function directHandler(id){
  const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns=[
    new RegExp(`\\$\\(['\"]${escaped}['\"]\\)\\.addEventListener\\(`),
    new RegExp(`getElementById\\(['\"]${escaped}['\"]\\)[\\s\\S]{0,180}?addEventListener\\(`)
  ];
  return scripts.some(source=>patterns.some(pattern=>pattern.test(source)));
}

test('every static web button with an id has an explicit click/action handler',()=>{
  const buttons=[...html.matchAll(/<button\b[^>]*\bid="([^"]+)"[^>]*>/g)].map(match=>match[1]);
  assert.ok(buttons.length>=25,'expected the main workspace controls');
  for(const id of buttons)assert.ok(directHandler(id),`${id} is a static button without an explicit handler`);
});

test('anonymous buttons outside forms declare a reusable action contract',()=>{
  const withoutForms=html.replace(/<form\b[\s\S]*?<\/form>/gi,'');
  const tags=[...withoutForms.matchAll(/<button\b([^>]*)>/gi)].map(match=>match[1]);
  const action=/\bdata-(?:view|view-jump|tool|external|close-modal)="[^"]+"/i;
  for(const attrs of tags){
    if(/\bid="[^"]+"/i.test(attrs))continue;
    assert.match(attrs,action,`anonymous decorative button found: <button${attrs}>`);
  }
});
