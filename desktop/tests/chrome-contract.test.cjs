'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');

const desktop=resolve(__dirname,'..');
const root=resolve(desktop,'..');
const html=readFileSync(resolve(desktop,'chrome.html'),'utf8');
const chrome=readFileSync(resolve(desktop,'chrome.js'),'utf8');
const preload=readFileSync(resolve(desktop,'preload.js'),'utf8');
const main=readFileSync(resolve(desktop,'main.js'),'utf8');
const webControls=readFileSync(resolve(root,'browser-controls.js'),'utf8');

function hasIdReference(id){
  return chrome.includes(`getElementById('${id}')`)||chrome.includes(`getElementById("${id}")`);
}

test('every static desktop chrome button is connected to desktop JavaScript',()=>{
  const ids=[...html.matchAll(/<button\b[^>]*\bid="([^"]+)"[^>]*>/g)].map(match=>match[1]);
  assert.ok(ids.length>=10,'expected the desktop chrome controls to be present');
  for(const id of ids)assert.ok(hasIdReference(id),`${id} is visible but has no chrome.js contract`);
});

test('core tab and navigation controls cross the isolated preload bridge',()=>{
  for(const method of ['navigate','back','forward','reload','newTab','activateTab','closeTab','cycleTab','restoreTab']){
    assert.match(preload,new RegExp(`\\b${method}:`),`${method} missing from preload bridge`);
  }
  for(const channel of ['hc:navigate','hc:back','hc:forward','hc:reload','hc:new-tab','hc:activate-tab','hc:close-tab','hc:cycle-tab','hc:restore-tab']){
    assert.ok(main.includes(`ipcMain.handle('${channel}'`),`${channel} missing from main process`);
  }
});

test('new tab button sits directly after the rendered tabs like a normal browser',()=>{
  const viewportStart=html.indexOf('class="tabs-viewport"');
  const tabsIndex=html.indexOf('id="tabs"',viewportStart);
  const newTabIndex=html.indexOf('id="newTab"',tabsIndex);
  const viewportEnd=html.indexOf('</div>',newTabIndex);
  assert.ok(viewportStart>=0&&tabsIndex>viewportStart&&newTabIndex>tabsIndex&&viewportEnd>newTabIndex,'new tab button must share the scrolling tab viewport after the tab list');
  assert.ok(html.includes('.tabs{display:flex;gap:6px;align-items:center;flex:0 0 auto}'),'tab list must size to its tabs instead of pushing + to the far edge');
  assert.ok(html.includes('.tabs-viewport{display:flex;gap:6px;align-items:center;min-width:0;overflow:auto;scrollbar-width:none;flex:1}'),'tab viewport must own available width and scrolling');
});

test('projects entry is discoverable instead of an unlabeled square',()=>{
  assert.match(html,/id="workspacesBtn"[^>]*>▱ Projetos<\/button>/);
  assert.ok(html.includes('.workspace-toggle{width:auto!important;min-width:104px'),'projects control should be a visible labeled action');
  assert.ok(chrome.includes("getElementById('workspacesBtn').addEventListener('click',()=>window.happyDesktop.openWorkspaces())"));
});

test('new windows from websites become internal Happy Coding tabs',()=>{
  assert.ok(main.includes("wc.setWindowOpenHandler(({url})=>{createTab(url,true);return{action:'deny'};});"));
});

test('closed tabs have both visible and keyboard restoration paths',()=>{
  assert.ok(html.includes('id="restoreTab"'),'visible restore-tab control missing');
  assert.ok(chrome.includes("restoreTabBtn.addEventListener('click',()=>window.happyDesktop.restoreTab())"));
  assert.ok(chrome.includes("event.shiftKey&&key==='t'"));
  assert.ok(main.includes('closedTabs.unshift(tab.url)'));
  assert.ok(main.includes('function restoreClosedTab()'));
});

test('workspace never draws a second fake tab strip inside Desktop',()=>{
  assert.ok(webControls.includes("const DESKTOP = /Electron\\//i.test(navigator.userAgent)"));
  assert.ok(webControls.includes('html.hc-desktop-host .browser-chrome{display:none!important}'));
  assert.ok(webControls.includes('html.hc-web-host .tabs-row{display:none!important}'));
});
