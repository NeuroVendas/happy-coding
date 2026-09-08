'use strict';

const q=id=>document.getElementById(id);
const AUTH_KEY='happyCoding.community.auth.v1';
const API='https://vzfnoaixjgyifutklpwn.supabase.co/rest/v1/';
const KEY='sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
function storedSession(){try{const parsed=JSON.parse(sessionStorage.getItem(AUTH_KEY));const s=parsed?.currentSession||parsed?.session||parsed;return s?.access_token&&s?.user?.id?s:null;}catch{return null;}}
function aal(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p.padEnd(p.length+(4-p.length%4)%4,'='))).aal||'aal1';}catch{return'aal1';}}

function addAccountEntryPoints(){
  const menu=q('menuPanel');
  if(menu&&!q('accountCenterLink')){const a=document.createElement('a');a.id='accountCenterLink';a.href='account.html';a.textContent='👤 Conta e segurança';menu.append(a);}
  const settings=document.querySelector('[data-view-panel="settings"] .settings-list');
  if(settings&&!q('accountCenterCard')){
    const card=document.createElement('article');card.id='accountCenterCard';const info=document.createElement('div');const title=document.createElement('strong');title.textContent='Conta Happy Coding';const copy=document.createElement('small');copy.textContent='Login, perfil, MFA, sincronização, privacidade e exclusão ficam na área Conta.';info.append(title,copy);const a=document.createElement('a');a.className='secondary-btn';a.href='account.html';a.textContent='Abrir Conta';card.append(info,a);settings.prepend(card);
  }
  const profile=q('profileBtn');
  if(profile&&!profile.dataset.accountCenter){profile.dataset.accountCenter='1';profile.title='Abrir Conta';profile.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();location.href='account.html';},true);}
}
async function addAdminEntry(){
  const s=storedSession(),menu=q('menuPanel');if(!s||aal(s.access_token)!=='aal2'||!menu||q('adminCenterLink'))return;
  try{const r=await fetch(`${API}hc_admin_members?select=user_id&user_id=eq.${encodeURIComponent(s.user.id)}`,{headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,Accept:'application/json'}});if(!r.ok)return;const rows=await r.json();if(rows.length!==1)return;const a=document.createElement('a');a.id='adminCenterLink';a.href='admin.html';a.textContent='🛡 Painel Admin';menu.append(a);}catch{}
}
addAccountEntryPoints();addAdminEntry();
document.addEventListener('happy:view',()=>{addAccountEntryPoints();addAdminEntry();});
document.addEventListener('happy:session-data-changed',addAdminEntry);
import('./public-feed.js').catch(()=>{});
