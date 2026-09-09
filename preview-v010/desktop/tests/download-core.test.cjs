const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cleanFilename,extensionOf,isRiskyDownload,safePercent,displayBytes}=require('../download-core');

test('dangerous executable and script extensions are flagged',()=>{
  for(const name of ['setup.exe','update.MSI','run.bat','script.ps1','shortcut.lnk','disk.iso','payload.jar'])assert.equal(isRiskyDownload(name),true,name);
});
test('common documents and archives are not flagged by extension alone',()=>{
  for(const name of ['manual.pdf','photo.png','code.zip','notes.txt','project.json'])assert.equal(isRiskyDownload(name),false,name);
});
test('filenames are bounded and stripped of Windows-invalid characters',()=>{
  assert.equal(cleanFilename('  bad<name>:file?.txt  '),'bad_name__file_.txt');
  assert.ok(cleanFilename('a'.repeat(400)).length<=180);
});
test('extension parsing is normalized',()=>{assert.equal(extensionOf('App.EXE'),'.exe');assert.equal(extensionOf('README'),'');});
test('download percentage is clamped and handles unknown size',()=>{
  assert.equal(safePercent(50,100),50);assert.equal(safePercent(150,100),100);assert.equal(safePercent(10,0),0);
});
test('byte display stays compact',()=>{assert.equal(displayBytes(0),'0 B');assert.equal(displayBytes(1024),'1.0 KB');assert.equal(displayBytes(5*1024*1024),'5.0 MB');});
