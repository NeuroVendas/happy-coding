'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {newProject,updateProject,normalizeStore,repository}=require('../workspace-core');
test('workspace stores only bounded unique HTTPS references without credentials',()=>{
  const p=newProject(' Meu jogo ');const next=updateProject(p,{name:'Meu jogo',notes:'n'.repeat(22000),links:['javascript:alert(1)','file:///secret','https://a:b@example.com','https://docs.godotengine.org','https://docs.godotengine.org',...Array.from({length:20},(_,i)=>`https://example.com/${i}`)]});
  assert.equal(next.notes.length,20000);assert.equal(next.links.length,10);assert.equal(next.links[0],'https://docs.godotengine.org/');
});
test('renderer updates cannot replace the selected native Godot path or project ID',()=>{
  const original={...newProject('Game'),godotProject:'C:\\My Game\\project.godot'};
  const next=updateProject(original,{id:'fake',name:'Updated',godotProject:'C:\\bad\\project.godot',godotExecutable:'evil.exe'});
  assert.equal(next.id,original.id);assert.equal(next.godotProject,original.godotProject);assert.equal(next.godotExecutable,undefined);
});
test('repository links are restricted to exact GitHub HTTPS repositories',()=>{
  assert.equal(repository('https://github.com/owner/repo/'),'https://github.com/owner/repo');
  for(const bad of ['https://github.com.evil/owner/repo','https://github.com/owner','https://github.com/owner/repo/issues','https://token@github.com/owner/repo','https://github.com/owner/repo?token=x'])assert.equal(repository(bad),'');
});
test('corrupt and oversized project collections are bounded and deduplicated',()=>{
  const p=newProject('A');assert.equal(normalizeStore({projects:[null,p,p]}).projects.length,1);
  assert.equal(normalizeStore({projects:Array.from({length:120},()=>newProject('A'))}).projects.length,100);
});
