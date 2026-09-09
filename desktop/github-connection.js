'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');

class GitHubConnection{
  constructor({clientId,vaultPath,safeStorage,request=fetch,wait=delay,onChange=()=>{}}){Object.assign(this,{clientId,vaultPath,safeStorage,request,wait,onChange});this.token=null;this.profile=null;this.flow=null;this.error='';}
  encryptedStorageAvailable(){return this.safeStorage.isEncryptionAvailable()&&this.safeStorage.getSelectedStorageBackend?.()!=='basic_text';}
  state(){return{configured:!!this.clientId,connected:!!this.profile,login:this.profile?.login||'',pending:!!this.flow,error:this.error};}
  emit(){this.onChange(this.state());}
  async json(url,options={}){
    const response=await this.request(url,{...options,redirect:'error',signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
    if(response.status===401){this.forget();throw new Error('A autorização expirou. Conecte o GitHub novamente.');}
    if(!response.ok)throw new Error(response.status===403||response.status===429?'Limite do GitHub atingido. Tente mais tarde.':'Não foi possível conectar ao GitHub.');
    return response.json();
  }
  async api(route,token=this.token){if(!token)throw new Error('Conecte o GitHub primeiro.');return this.json(`https://api.github.com${route}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});}
  async restore(){
    if(!this.encryptedStorageAvailable())return;
    try{if(!fs.existsSync(this.vaultPath))return;this.token=this.safeStorage.decryptString(fs.readFileSync(this.vaultPath));
      const p=await this.api('/user');this.profile={login:String(p.login||'').slice(0,80)};
    }catch{this.token=null;this.profile=null;this.error='Não foi possível restaurar a conexão. Conecte novamente.';}this.emit();
  }
  async start(){
    if(!this.clientId)throw new Error('A conexão GitHub ainda precisa do registro do aplicativo Happy Coding.');
    if(!this.encryptedStorageAvailable())throw new Error('O armazenamento protegido do sistema não está disponível.');
    if(this.flow)throw new Error('Já existe uma autorização em andamento.');
    const controller=new AbortController();this.flow=controller;this.error='';this.emit();
    try{
      const data=await this.json('https://github.com/login/device/code',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:this.clientId,scope:'read:user'}).toString(),signal:controller.signal});
      if(controller.signal.aborted)return null;
      if(!data.device_code||!data.user_code||data.verification_uri!=='https://github.com/login/device')throw new Error('O GitHub não iniciou a autorização. Confira se Device Flow está habilitado.');
      this.poll(data,controller).catch(error=>{if(this.flow!==controller)return;this.error=error.message;this.flow=null;this.emit();});
      return{userCode:String(data.user_code).slice(0,40),verificationUrl:'https://github.com/login/device',expiresIn:Math.min(Number(data.expires_in)||900,900)};
    }catch(error){if(this.flow===controller){this.flow=null;this.emit();}throw error;}
  }
  async poll(data,controller){
    let interval=Math.max(5,Number(data.interval)||5);
    const deadline=Date.now()+Math.min(Number(data.expires_in)||900,900)*1000;
    while(Date.now()<deadline&&!controller.signal.aborted){
      await this.wait(interval*1000,undefined,{signal:controller.signal});
      const result=await this.json('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:this.clientId,device_code:data.device_code,grant_type:'urn:ietf:params:oauth:grant-type:device_code'}).toString(),signal:controller.signal});
      if(this.flow!==controller||controller.signal.aborted)return;
      if(result.error==='authorization_pending')continue;
      if(result.error==='slow_down'){interval+=5;continue;}
      if(result.error)throw new Error(result.error==='access_denied'?'Autorização cancelada no GitHub.':'O código expirou. Inicie a conexão novamente.');
      if(!result.access_token)throw new Error('O GitHub retornou uma autorização inválida.');
      const profile=await this.api('/user',result.access_token);
      if(this.flow!==controller||controller.signal.aborted)return;
      const encrypted=this.safeStorage.encryptString(result.access_token);
      fs.mkdirSync(path.dirname(this.vaultPath),{recursive:true});
      fs.writeFileSync(this.vaultPath,encrypted,{mode:0o600});
      this.token=result.access_token;this.profile={login:String(profile.login||'').slice(0,80)};this.flow=null;this.error='';this.emit();return;
    }
    throw new Error('O código expirou. Inicie a conexão novamente.');
  }
  cancel(){this.flow?.abort();this.flow=null;this.emit();}
  forget(){this.cancel();this.token=null;this.profile=null;try{fs.unlinkSync(this.vaultPath);}catch(error){if(error.code!=='ENOENT')throw new Error('Não foi possível remover a conexão salva.');}this.emit();}
  async repositories(page=1){
    const number=Math.max(1,Math.min(50,Math.floor(Number(page)||1)));
    const data=await this.api(`/user/repos?visibility=public&sort=updated&per_page=30&page=${number}`);
    if(!Array.isArray(data))throw new Error('Resposta inesperada do GitHub.');
    return data.filter(p=>!p.private).map(p=>({name:String(p.full_name||'').slice(0,200),url:String(p.html_url||'').slice(0,500),description:String(p.description||'').slice(0,200)}));
  }
}
module.exports={GitHubConnection};
