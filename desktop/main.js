'use strict';
const {app,BaseWindow,WebContentsView,session}=require('electron');
const path=require('node:path');

const HOME='https://neurovendas.github.io/happy-coding/';
let win,chromeView,pageView;

function safeTarget(raw){
  try{
    const value=String(raw||'').trim();
    if(!value)return HOME;
    if(/^happy:\/\/home$/i.test(value))return HOME;
    if(!/^[a-z][a-z0-9+.-]*:/i.test(value)){
      if(/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(value))return `https://${value}`;
      return `https://www.google.com/search?safe=active&q=${encodeURIComponent(value)}`;
    }
    const url=new URL(value);
    if(url.protocol!=='https:')throw new Error('Only HTTPS navigation is allowed');
    return url.href;
  }catch{return `https://www.google.com/search?safe=active&q=${encodeURIComponent(String(raw||''))}`;}
}
function createRemoteView(){
  const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}});
  view.webContents.setWindowOpenHandler(({url})=>{navigate(url);return{action:'deny'};});
  view.webContents.on('will-navigate',(event,url)=>{
    const target=safeTarget(url);
    if(target!==url){event.preventDefault();view.webContents.loadURL(target);}
  });
  return view;
}
function navigate(raw){
  const target=safeTarget(raw);
  pageView.webContents.loadURL(target);
  chromeView.webContents.send('hc:navigation-state',{url:target});
}
function resize(){
  if(!win)return;const b=win.getContentBounds();const top=94;
  chromeView.setBounds({x:0,y:0,width:b.width,height:top});
  pageView.setBounds({x:0,y:top,width:b.width,height:Math.max(0,b.height-top)});
}
app.enableSandbox();
app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  win=new BaseWindow({width:1280,height:820,minWidth:760,minHeight:520,title:'Happy Coding =]'});
  chromeView=new WebContentsView({webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  pageView=createRemoteView();
  win.contentView.addChildView(chromeView);win.contentView.addChildView(pageView);
  chromeView.webContents.loadFile(path.join(__dirname,'chrome.html'));
  pageView.webContents.loadURL(HOME);
  resize();win.on('resize',resize);
  win.on('closed',()=>{chromeView?.webContents.close();pageView?.webContents.close();win=null;});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

const {ipcMain}=require('electron');
ipcMain.handle('hc:navigate',(event,value)=>{if(event.sender!==chromeView?.webContents)return false;navigate(value);return true;});
ipcMain.handle('hc:back',(event)=>{if(event.sender!==chromeView?.webContents)return false;if(pageView.webContents.canGoBack())pageView.webContents.goBack();return true;});
ipcMain.handle('hc:forward',(event)=>{if(event.sender!==chromeView?.webContents)return false;if(pageView.webContents.canGoForward())pageView.webContents.goForward();return true;});
ipcMain.handle('hc:reload',(event)=>{if(event.sender!==chromeView?.webContents)return false;pageView.webContents.reload();return true;});