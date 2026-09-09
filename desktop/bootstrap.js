'use strict';

const {app,autoUpdater,dialog}=require('electron');
const squirrelStartup=require('electron-squirrel-startup');

const UPDATE_REPO='NeuroVendas/happy-coding';
const UPDATE_INTERVAL_MS=30*60*1000;

function updaterFeed(){
  return `https://update.electronjs.org/${UPDATE_REPO}/${process.platform}-${process.arch}/${app.getVersion()}`;
}

function scheduleUpdates(){
  if(!app.isPackaged||process.platform!=='win32')return;
  try{
    autoUpdater.setFeedURL({url:updaterFeed()});
  }catch(error){
    console.error('[Happy Coding updater] feed setup failed',error);
    return;
  }

  let checking=false;
  const check=async()=>{
    if(checking)return;
    checking=true;
    try{await autoUpdater.checkForUpdates();}
    catch(error){console.error('[Happy Coding updater] check failed',error);}
    finally{checking=false;}
  };

  autoUpdater.on('error',error=>console.error('[Happy Coding updater] error',error));
  autoUpdater.on('update-available',()=>console.log('[Happy Coding updater] update available'));
  autoUpdater.on('update-not-available',()=>console.log('[Happy Coding updater] app is current'));
  autoUpdater.on('update-downloaded',async(_event,_notes,releaseName)=>{
    const version=String(releaseName||'nova versão').slice(0,80);
    const result=await dialog.showMessageBox({
      type:'info',
      title:'Atualização pronta — Happy Coding',
      message:`A atualização ${version} foi baixada.`,
      detail:'Reinicie o Happy Coding para instalar a nova versão. Suas abas e dados locais permanecem salvos.',
      buttons:['Reiniciar e atualizar','Depois'],
      defaultId:0,
      cancelId:1,
      noLink:true
    });
    if(result.response===0)autoUpdater.quitAndInstall();
  });

  const startupDelay=process.argv.includes('--squirrel-firstrun')?12000:5000;
  const first=setTimeout(check,startupDelay);first.unref?.();
  const timer=setInterval(check,UPDATE_INTERVAL_MS);timer.unref?.();
}

if(process.platform==='win32')app.setAppUserModelId('com.squirrel.happy_coding.HappyCoding');

if(squirrelStartup){
  app.quit();
}else{
  app.whenReady().then(scheduleUpdates);
  require('./main');
}
