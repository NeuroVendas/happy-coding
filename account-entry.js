'use strict';

const q=id=>document.getElementById(id);

function addAccountEntryPoints(){
  const menu=q('menuPanel');
  if(menu&&!q('accountCenterLink')){
    const a=document.createElement('a');
    a.id='accountCenterLink';
    a.href='account.html';
    a.textContent='👤 Conta e segurança';
    menu.append(a);
  }

  const settings=document.querySelector('[data-view-panel="settings"] .settings-list');
  if(settings&&!q('accountCenterCard')){
    const card=document.createElement('article');
    card.id='accountCenterCard';
    const info=document.createElement('div');
    const title=document.createElement('strong');title.textContent='Conta Happy Coding';
    const copy=document.createElement('small');copy.textContent='Login, perfil, MFA, sincronização, privacidade e exclusão ficam na área Conta.';
    info.append(title,copy);
    const a=document.createElement('a');a.className='secondary-btn';a.href='account.html';a.textContent='Abrir Conta';
    card.append(info,a);settings.prepend(card);
  }

  const profile=q('profileBtn');
  if(profile&&!profile.dataset.accountCenter){
    profile.dataset.accountCenter='1';
    profile.title='Abrir Conta';
    profile.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href='account.html';
    },true);
  }
}

addAccountEntryPoints();
document.addEventListener('happy:view',addAccountEntryPoints);
import('./public-feed.js').catch(()=>{});
