'use strict';

const HC_SUPABASE_URL='https://vzfnoaixjgyifutklpwn.supabase.co';
const HC_PUBLIC_KEY='sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
const REPORT_REASONS={
  adult:'Conteúdo adulto explícito',
  harassment:'Assédio / ataque a pessoa',
  hate:'Ódio contra grupo protegido',
  real_violence:'Violência real / ameaça',
  self_harm:'Incentivo a automutilação',
  personal_data:'Dados pessoais / privacidade',
  spam:'Spam / golpe',
  other:'Outro problema'
};
let safetyClientPromise;
const q=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const btn=(text,fn,cls='secondary-btn')=>{const n=el('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;};

async function safetyClient(){
  if(!safetyClientPromise)safetyClientPromise=(async()=>{
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
    return createClient(HC_SUPABASE_URL,HC_PUBLIC_KEY,{auth:{storage:sessionStorage,storageKey:'happyCoding.community.auth.v1',detectSessionInUrl:true}});
  })();
  return safetyClientPromise;
}
function openDialog(title){
  const d=el('dialog','community-dialog safety-dialog');
  d.append(el('h2','',title),btn('×',()=>d.close(),'dialog-close'));
  d.lastChild.setAttribute('aria-label','Fechar');
  d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();return d;
}
async function currentUser(){const db=await safetyClient();const {data}=await db.auth.getSession();return data.session?.user||null;}
async function findPostFromCard(card){
  const title=card.querySelector('h2')?.textContent?.trim();
  if(!title)return null;
  const author=(card.querySelector('header span')?.textContent||'').split(' · ')[0].trim();
  const db=await safetyClient();
  const {data,error}=await db.from('hc_community_posts').select('id,author_id,author_name,title,body,status,created_at').eq('status','published').eq('title',title).eq('author_name',author).order('created_at',{ascending:false}).limit(10);
  if(error||!data?.length)return null;
  const body=card.querySelector('.post-body')?.textContent?.trim();
  if(body){const exact=data.find(p=>p.body===body);if(exact)return exact;}
  return data[0];
}
async function reportCard(card){
  const user=await currentUser();
  if(!user){window.toast?.('Entre na sua conta para denunciar um post.');q('communityAccount')?.click();return;}
  const post=await findPostFromCard(card);
  if(!post){window.toast?.('Abra o conteúdo do post e tente novamente.');return;}
  if(post.author_id===user.id){window.toast?.('Você pode excluir seu próprio post em vez de denunciá-lo.');return;}
  const d=openDialog('Denunciar post');
  d.append(el('p','',`Post: ${post.title}`),el('p','modal-copy','A denúncia fica visível para você e para moderadores autorizados. Não use esse recurso para discordâncias comuns.'));
  const form=el('form');d.append(form);
  const label=el('label','','Motivo');const select=el('select');
  for(const [value,text] of Object.entries(REPORT_REASONS)){const o=el('option','',text);o.value=value;select.append(o);}label.append(select);form.append(label);
  const detailLabel=el('label','','Detalhes opcionais');const details=el('textarea');details.maxLength=1000;details.placeholder='Explique o problema sem incluir dados pessoais desnecessários.';detailLabel.append(details);form.append(detailLabel);
  const status=el('p','form-status');status.setAttribute('role','status');
  const submit=btn('Enviar denúncia',()=>{},'primary-btn');submit.type='submit';form.append(submit,status);
  form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;status.textContent='Enviando…';try{
    const db=await safetyClient();const {error}=await db.from('hc_community_reports').insert({post_id:post.id,reporter_id:user.id,reason:select.value,details:details.value.trim()});
    if(error){if(error.code==='23505')status.textContent='Você já denunciou este post.';else if(error.code==='P0001')status.textContent='Muitas denúncias em pouco tempo. Aguarde.';else status.textContent='Não foi possível enviar agora.';return;}
    d.close();window.toast?.('Denúncia enviada para revisão.');
  }finally{submit.disabled=false;}});
}
function attachReportButtons(){
  document.querySelectorAll('.community-post').forEach(card=>{
    if(card.dataset.reportReady)return;card.dataset.reportReady='1';
    const actions=card.querySelector('.post-actions');if(!actions)return;
    actions.append(btn('Denunciar',()=>reportCard(card),'report-btn'));
  });
}
const feed=q('communityFeed');if(feed)new MutationObserver(attachReportButtons).observe(feed,{childList:true,subtree:true});attachReportButtons();

async function moderatorState(){
  const db=await safetyClient();const {data:{session}}=await db.auth.getSession();if(!session)return false;
  const aal=session.access_token?JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).aal:null;
  if(aal!=='aal2')return false;
  const {data,error}=await db.from('hc_admin_members').select('user_id').eq('user_id',session.user.id).limit(1);return !error&&data?.length===1;
}
async function openReports(){
  if(!await moderatorState()){window.toast?.('A fila de denúncias exige moderador com MFA ativo.');return;}
  const d=openDialog('Denúncias da comunidade');const status=el('p','form-status','Carregando…'),list=el('div','report-list');d.append(status,list);
  const db=await safetyClient();const {data,error}=await db.from('hc_community_reports').select('id,post_id,reporter_id,reason,details,status,created_at').eq('status','open').order('created_at',{ascending:true}).limit(100);
  if(error){status.textContent='Não foi possível carregar as denúncias.';return;}status.textContent=data.length?`${data.length} denúncia(s) aberta(s).`:'Nenhuma denúncia aberta.';
  for(const report of data){
    const row=el('article','report-item');row.append(el('strong','',REPORT_REASONS[report.reason]||report.reason),el('small','',new Date(report.created_at).toLocaleString('pt-BR')));
    if(report.details)row.append(el('p','',report.details));
    const actions=el('div','report-actions');
    actions.append(btn('Abrir post',async()=>{const {data:post}=await db.from('hc_community_posts').select('title,author_name,body,code,status').eq('id',report.post_id).maybeSingle();if(!post){window.toast?.('O post não existe mais.');return;}const p=openDialog(`Post denunciado: ${post.title}`);p.append(el('p','',`Autor: ${post.author_name} · status: ${post.status}`),el('p','post-body',post.body));if(post.code){const pre=el('pre','post-code');pre.append(el('code','',post.code));p.append(pre);}}));
    actions.append(btn('Marcar revisada',async()=>{const {error}=await db.from('hc_community_reports').update({status:'reviewed'}).eq('id',report.id);if(!error)row.remove();}));
    actions.append(btn('Dispensar',async()=>{const {error}=await db.from('hc_community_reports').update({status:'dismissed'}).eq('id',report.id);if(!error)row.remove();}));
    row.append(actions);list.append(row);
  }
}
async function ensureModeratorButton(){
  const toolbar=document.querySelector('.community-toolbar');if(!toolbar||q('communityReports'))return;
  const b=btn('Revisar denúncias',openReports);b.id='communityReports';b.classList.add('hidden');toolbar.append(b);
  try{b.classList.toggle('hidden',!await moderatorState());}catch{b.classList.add('hidden');}
}
ensureModeratorButton();document.addEventListener('happy:view',e=>{if(e.detail==='community'){attachReportButtons();ensureModeratorButton();}});

function addSafetyLinks(){
  const menu=q('menuPanel');if(menu&&!q('privacyLink')){
    const privacy=document.createElement('a');privacy.id='privacyLink';privacy.href='privacy.html';privacy.textContent='Privacidade';
    const rules=document.createElement('a');rules.href='community-guidelines.html';rules.textContent='Regras da comunidade';
    menu.append(privacy,rules);
  }
  const settings=document.querySelector('[data-view-panel="settings"] .settings-list');if(settings&&!q('safetyDocs')){
    const item=el('article');item.id='safetyDocs';const copy=el('div');copy.append(el('strong','','Privacidade e segurança'),el('small','','Veja o que fica local, o que vai ao Supabase e como a moderação funciona.'));
    const links=el('div','legal-links');const a=document.createElement('a');a.href='privacy.html';a.textContent='Privacidade';const b=document.createElement('a');b.href='community-guidelines.html';b.textContent='Regras';links.append(a,b);item.append(copy,links);settings.append(item);
  }
}
addSafetyLinks();