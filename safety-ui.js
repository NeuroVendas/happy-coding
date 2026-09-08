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

// Search stays inside Happy Coding; providers are an implementation detail.
const HC_WEB_SEARCH_URL=`${HC_SUPABASE_URL}/functions/v1/web-search`;
const HC_HISTORY_KEY='happyCoding.history.v1';
let hcSearchVersion=0;

function hcLooksLikeAddress(value){
  const v=String(value||'').trim();
  if(!v||v==='happy://home')return true;
  if(/^[a-z][a-z0-9+.-]*:/i.test(v))return true;
  return /^([a-z0-9-]+\.)+[a-z]{2,}(?::\d{1,5})?(\/.*)?$/i.test(v);
}
function hcAdultSearch(value){
  const t=String(value||'').toLowerCase();
  return ['porn','porno','pornografia','hentai','xvideos','xnxx','onlyfans nude','nudes','sexo explícito','sex videos','rule34','nhentai'].some(term=>t.includes(term));
}
function hcInjectSearchStyle(){
  if(q('hcSearchStyle'))return;
  const style=document.createElement('style');style.id='hcSearchStyle';style.textContent=`
    .hc-search-view{max-width:960px;margin:0 auto;padding:6px 0 70px}.hc-search-head{display:flex;gap:18px;align-items:flex-start;justify-content:space-between;padding:8px 0 18px;border-bottom:1px solid var(--line,#292e36);margin-bottom:12px}.hc-search-head h1{margin:4px 0 0;font-size:clamp(1.55rem,3vw,2.05rem);letter-spacing:-.03em}.hc-search-query{margin:7px 0 0;color:var(--muted,#8e969f);font-size:.94rem}.hc-search-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #354128;border-radius:999px;background:#172014;color:#c9ee89;font-size:.72rem;font-weight:750;white-space:nowrap}.hc-search-badge::before{content:'';width:7px;height:7px;border-radius:50%;background:#b7f34a;box-shadow:0 0 0 4px #b7f34a12}.hc-search-status{min-height:22px;margin:12px 0 14px;color:#8f98a3;font-size:.84rem}.hc-search-list{display:grid;gap:9px}.hc-search-card{width:100%;text-align:left;background:#15181d;border:1px solid #292e36;border-radius:13px;padding:15px 17px;color:inherit;cursor:pointer;transition:border-color .14s ease,background .14s ease,transform .14s ease}.hc-search-card:hover,.hc-search-card:focus-visible{border-color:#607b36;background:#181d18;transform:translateY(-1px)}.hc-search-card strong{display:block;font-size:1rem;margin:4px 0 6px;color:#eaf4d9;font-weight:720}.hc-search-host{display:block;font-size:.72rem;color:#9ab46f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hc-search-card p{margin:0;color:#a7afb7;font-size:.88rem;line-height:1.5}.hc-search-state{display:flex;align-items:center;gap:12px;padding:16px 17px;border:1px solid #292e36;border-radius:13px;background:#15181d;color:#a7afb7}.hc-search-dot{width:10px;height:10px;border-radius:50%;background:#b7f34a;box-shadow:0 0 0 0 #b7f34a40;animation:hcPulse 1.25s infinite}.hc-search-error{display:block}.hc-search-error strong{display:block;color:#eef0eb;margin-bottom:5px}.hc-search-error p{margin:0;color:#959da6;line-height:1.5}.hc-search-retry{margin-top:13px}@keyframes hcPulse{50%{box-shadow:0 0 0 8px #b7f34a00;opacity:.55}}@media(max-width:700px){.hc-search-view{padding-bottom:90px}.hc-search-head{flex-direction:column}.hc-search-card{padding:14px}.hc-search-badge{align-self:flex-start}}
  `;document.head.append(style);
}
function hcEnsureSearchView(){
  let section=q('hcSearchView');if(section)return section;
  hcInjectSearchStyle();section=el('section','view hc-search-view');section.id='hcSearchView';section.dataset.viewPanel='search';
  const head=el('div','hc-search-head');const titleBox=el('div');
  titleBox.append(el('span','section-kicker','BUSCA HAPPY CODING'),el('h1','','Resultados'));
  const queryLine=el('p','hc-search-query');queryLine.id='hcSearchQuery';titleBox.append(queryLine);
  head.append(titleBox,el('span','hc-search-badge','Proteção ativa'));
  const status=el('p','hc-search-status');status.id='hcSearchStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const list=el('div','hc-search-list');list.id='hcSearchList';section.append(head,status,list);q('mainView')?.append(section);return section;
}
function hcShowSearchView(query){
  const section=hcEnsureSearchView();document.querySelectorAll('[data-view-panel]').forEach(view=>view.classList.remove('active'));section.classList.add('active');document.querySelectorAll('[data-view]').forEach(link=>link.classList.remove('active'));
  const input=q('addressInput');if(input)input.value=query;const line=q('hcSearchQuery');if(line)line.textContent=`Resultados para “${query}”`;window.scrollTo({top:0,behavior:'smooth'});
}
function hcRememberResult(url,title){
  try{const current=JSON.parse(localStorage.getItem(HC_HISTORY_KEY)||'[]');current.unshift({url,title:title||url,at:new Date().toISOString()});localStorage.setItem(HC_HISTORY_KEY,JSON.stringify(current.slice(0,100)));}catch{}
}
function hcOpenResult(result){
  try{const url=new URL(result.url);if(!['http:','https:'].includes(url.protocol))return;hcRememberResult(url.href,result.title);window.open(url.href,'_blank','noopener');}catch{}
}
function hcRenderSearchResults(payload){
  const list=q('hcSearchList');if(!list)return;list.replaceChildren();
  const results=Array.isArray(payload?.results)?payload.results:[];
  if(!results.length){const box=el('div','hc-search-state');box.append(el('span','hc-search-dot'),el('span','','Nenhum resultado encontrado para esta pesquisa.'));list.append(box);return;}
  for(const item of results){
    let host='';try{host=new URL(item.url).hostname.replace(/^www\./,'');}catch{continue;}
    const card=el('button','hc-search-card');card.type='button';card.append(el('span','hc-search-host',host),el('strong','',String(item.title||host).slice(0,180)));
    if(item.snippet)card.append(el('p','',String(item.snippet).slice(0,420)));card.addEventListener('click',()=>hcOpenResult(item));list.append(card);
  }
}
function hcLoading(){
  const list=q('hcSearchList');if(!list)return;list.replaceChildren();const box=el('div','hc-search-state');box.append(el('span','hc-search-dot'),el('span','','Pesquisando…'));list.append(box);
}
function hcFriendlySearchError(payload,statusCode){
  if(statusCode===429)return'Muitas pesquisas em pouco tempo. Aguarde um instante e tente novamente.';
  if(payload?.error==='blocked_query')return'Esta pesquisa foi bloqueada pela proteção obrigatória do Happy Coding.';
  return'Não foi possível concluir a pesquisa agora. Tente novamente em alguns segundos.';
}
async function hcRunSearch(raw){
  const query=String(raw||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,240);if(!query)return;
  if(hcAdultSearch(query)){q('blockedModal')?.classList.remove('hidden');return;}
  const version=++hcSearchVersion;hcShowSearchView(query);const status=q('hcSearchStatus');if(status)status.textContent='';hcLoading();
  try{
    const response=await fetch(HC_WEB_SEARCH_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':HC_PUBLIC_KEY},body:JSON.stringify({q:query})});
    const payload=await response.json().catch(()=>({}));if(version!==hcSearchVersion)return;
    if(!response.ok)throw Object.assign(new Error('search_failed'),{payload,statusCode:response.status});
    const count=Array.isArray(payload.results)?payload.results.length:0;if(status)status.textContent=`${count} resultado${count===1?'':'s'}`;hcRenderSearchResults(payload);
  }catch(error){
    if(version!==hcSearchVersion)return;if(status)status.textContent='Pesquisa indisponível';const list=q('hcSearchList');if(list){list.replaceChildren();const box=el('div','hc-search-state hc-search-error');box.append(el('strong','','Não conseguimos pesquisar agora.'),el('p','',hcFriendlySearchError(error?.payload,error?.statusCode)));box.append(btn('Tentar novamente',()=>hcRunSearch(query),'secondary-btn hc-search-retry'));list.append(box);}
  }
}
function hcInterceptSearchForm(form,input,alwaysSearch=false){
  if(!form||!input)return;form.addEventListener('submit',event=>{
    const value=input.value.trim();if(!value)return;
    if(!alwaysSearch&&hcLooksLikeAddress(value))return;
    event.preventDefault();event.stopImmediatePropagation();hcRunSearch(value);
  },true);
}
hcInterceptSearchForm(q('addressForm'),q('addressInput'),false);hcInterceptSearchForm(q('universalSearch'),q('searchInput'),true);
document.addEventListener('happy:view',event=>{if(event.detail!=='search')q('hcSearchView')?.classList.remove('active');});
