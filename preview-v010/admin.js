const URL_BASE='https://vzfnoaixjgyifutklpwn.supabase.co';
const KEY='sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
const STORAGE_KEY='happyCoding.community.auth.v1';
const legacySession=sessionStorage.getItem(STORAGE_KEY);
if(!localStorage.getItem(STORAGE_KEY)&&legacySession)localStorage.setItem(STORAGE_KEY,legacySession);
const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
const db=createClient(URL_BASE,KEY,{auth:{storage:localStorage,storageKey:STORAGE_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const q=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,cls='secondary-btn')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
let session=null,users=[],sanctionsReady=false,contentReady=false;

function aal(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p.padEnd(p.length+(4-p.length%4)%4,'='))).aal||'aal1';}catch{return'aal1';}}
function humanError(error){const c=error?.code||'';if(c==='P0001')return error.message||'Ação bloqueada.';if(c==='42501')return'Permissão negada. Confirme o MFA.';if(c==='42P01'||c==='PGRST205')return'Backend desta função ainda não foi aplicado.';return'Não foi possível concluir.';}
async function audit(action,target=null,details={}){try{await db.from('hc_admin_audit_log').insert({admin_id:session.user.id,action,target_user_id:target,details});}catch{}}
function row(title,subtitle=''){const n=el('article','admin-row');const h=el('header');h.append(el('strong','',title));if(subtitle)h.append(el('small','',subtitle));n.append(h);return n;}
function setTab(name){document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===name));document.querySelectorAll('[data-admin-panel]').forEach(p=>p.classList.toggle('active',p.dataset.adminPanel===name));if(name==='users'){loadUsers();loadSanctions();}if(name==='moderation'){loadPending();loadReports();}if(name==='announcements')loadAnnouncements();if(name==='events')loadEvents();}
document.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.adminTab)));
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.jump)));

async function requireAdmin(){
  const {data,error}=await db.auth.getSession();if(error||!data.session)throw new Error('no_session');session=data.session;
  if(aal(session.access_token)!=='aal2')throw new Error('mfa_required');
  const check=await db.from('hc_admin_members').select('user_id').eq('user_id',session.user.id).maybeSingle();if(check.error||!check.data)throw new Error('not_admin');
}
async function detectBackend(){
  const s=await db.from('hc_user_sanctions').select('id').limit(1);sanctionsReady=!s.error;
  const a=await db.from('hc_announcements').select('id').limit(1);const e=await db.from('hc_events').select('id').limit(1);contentReady=!a.error&&!e.error;
  if(!sanctionsReady){q('overviewUsers').textContent='Diretório e sanções aguardam a migração do backend; moderação atual continua disponível.';}
  if(!contentReady){q('announcementStatus').textContent='Backend de anúncios ainda não aplicado.';q('eventStatus').textContent='Backend de eventos ainda não aplicado.';}
}
async function init(){
  try{await requireAdmin();q('adminStatus').textContent=`Admin autenticado · MFA ${aal(session.access_token).toUpperCase()}`;q('adminApp').classList.remove('hidden');await detectBackend();await Promise.allSettled([loadOverview(),loadPending(),loadReports()]);}
  catch(error){if(error.message==='no_session')q('adminStatus').textContent='Entre na sua conta primeiro em Conta.';else if(error.message==='mfa_required')q('adminStatus').textContent='Sua conta admin existe, mas esta sessão precisa verificar o MFA. Vá em Conta → Segurança.';else q('adminStatus').textContent='Esta sessão não tem acesso administrativo.';}
}

async function loadOverview(){
  const posts=await db.from('hc_community_posts').select('id,status');
  if(!posts.error){const pending=posts.data.filter(x=>x.status==='pending').length;q('overviewPosts').textContent=`${pending} post(s) aguardando revisão · ${posts.data.length} post(s) visíveis para esta conta admin.`;}
  if(sanctionsReady){const dir=await db.from('hc_user_directory').select('user_id');q('overviewUsers').textContent=dir.error?'Não foi possível contar usuários.':`${dir.data.length} usuário(s) no diretório administrativo.`;}
}

async function loadUsers(){
  const root=q('userList');root.replaceChildren();let list=[];
  const directory=await db.from('hc_user_directory').select('user_id,email,display_name,joined_at,last_seen_at').order('joined_at',{ascending:false}).limit(200);
  if(!directory.error)list=directory.data.map(x=>({...x,name:x.display_name||x.email}));
  else{
    const posts=await db.from('hc_community_posts').select('author_id,author_name,created_at').order('created_at',{ascending:false}).limit(500);
    const seen=new Map();for(const p of posts.data||[])if(!seen.has(p.author_id))seen.set(p.author_id,{user_id:p.author_id,email:'',name:p.author_name,last_seen_at:p.created_at});list=[...seen.values()];
    if(!list.some(x=>x.user_id===session.user.id))list.unshift({user_id:session.user.id,email:session.user.email,name:'Administrador',last_seen_at:new Date().toISOString()});
  }
  users=list;renderUsers();
}
function renderUsers(){
  const root=q('userList');root.replaceChildren();const term=q('userSearch').value.trim().toLowerCase();const list=users.filter(u=>`${u.email||''} ${u.name||''} ${u.user_id}`.toLowerCase().includes(term));
  if(!list.length){root.append(el('p','', 'Nenhum usuário encontrado.'));return;}
  for(const u of list){const r=row(u.name||u.email||'Usuário',u.email||'participante da comunidade');r.append(el('code','',u.user_id));if(u.last_seen_at)r.append(el('small','',`Última atividade registrada: ${new Date(u.last_seen_at).toLocaleString('pt-BR')}`));const actions=el('div','admin-actions');
    if(u.user_id!==session.user.id){
      const t1=button('Timeout 1h',()=>sanction(u,'timeout',1),'warning-btn');const t24=button('Timeout 24h',()=>sanction(u,'timeout',24),'warning-btn');const ban=button('Banir da comunidade',()=>sanction(u,'ban',null),'danger-btn');for(const b of [t1,t24,ban])b.disabled=!sanctionsReady;actions.append(t1,t24,ban);
    }else actions.append(el('small','', 'Sua própria conta admin não pode ser sancionada por este painel.'));
    r.append(actions);root.append(r);
  }
}
q('userSearch').addEventListener('input',renderUsers);
async function sanction(user,kind,hours){
  if(!sanctionsReady){alert('O backend de sanções ainda não foi aplicado.');return;}const label=kind==='ban'?'banimento da comunidade':`timeout de ${hours}h`;const reason=prompt(`Motivo para ${label} de ${user.name||user.email||user.user_id}:`);if(!reason||reason.trim().length<3)return;if(!confirm(`Confirmar ${label}?`))return;
  const payload={user_id:user.user_id,kind,scope:'community',reason:reason.trim(),created_by:session.user.id};if(hours)payload.expires_at=new Date(Date.now()+hours*3600000).toISOString();
  const {error}=await db.from('hc_user_sanctions').insert(payload);if(error){alert(humanError(error));return;}await audit(`sanction.${kind}`,user.user_id,{hours,reason:reason.trim()});await loadSanctions();
}
async function loadSanctions(){
  const root=q('sanctionList');root.replaceChildren();if(!sanctionsReady){root.append(el('p','', 'Backend de sanções ainda não aplicado.'));return;}
  const {data,error}=await db.from('hc_user_sanctions').select('id,user_id,kind,reason,created_at,expires_at,revoked_at').is('revoked_at',null).order('created_at',{ascending:false}).limit(100);if(error){root.append(el('p','',humanError(error)));return;}if(!data.length){root.append(el('p','', 'Nenhuma sanção ativa.'));return;}
  for(const s of data){if(s.expires_at&&new Date(s.expires_at)<=new Date())continue;const u=users.find(x=>x.user_id===s.user_id);const r=row(`${s.kind==='ban'?'Ban':'Timeout'} · ${u?.name||s.user_id}`,s.expires_at?`até ${new Date(s.expires_at).toLocaleString('pt-BR')}`:'sem expiração');r.append(el('p','',s.reason));r.append(button('Remover sanção',async()=>{if(!confirm('Remover esta sanção?'))return;const {error}=await db.from('hc_user_sanctions').update({revoked_at:new Date().toISOString(),revoked_by:session.user.id}).eq('id',s.id);if(!error){await audit('sanction.revoke',s.user_id,{sanction_id:s.id});loadSanctions();}},'secondary-btn'));root.append(r);}
}

async function loadPending(){
  const root=q('pendingPosts');root.replaceChildren();const {data,error}=await db.from('hc_community_posts').select('id,author_id,author_name,title,body,code,created_at').eq('status','pending').order('created_at',{ascending:true}).limit(100);if(error){root.append(el('p','',humanError(error)));return;}if(!data.length){root.append(el('p','', 'Nenhum post pendente.'));return;}
  for(const p of data){const r=row(p.title,`${p.author_name} · ${new Date(p.created_at).toLocaleString('pt-BR')}`);r.append(el('p','',p.body));if(p.code){const pre=el('pre','post-code');pre.append(el('code','',p.code));r.append(pre);}const actions=el('div','admin-actions');actions.append(button('Aprovar',()=>moderatePost(p,'published'),'primary-btn'),button('Rejeitar',()=>moderatePost(p,'rejected'),'danger-btn'));r.append(actions);root.append(r);}
}
async function moderatePost(post,status){if(status==='published'&&!confirm('Você revisou o conteúdo e quer publicar?'))return;const {error}=await db.from('hc_community_posts').update({status}).eq('id',post.id);if(error){alert(humanError(error));return;}await audit(`post.${status}`,post.author_id,{post_id:post.id});loadPending();loadOverview();}
q('refreshPosts').addEventListener('click',loadPending);
async function loadReports(){
  const root=q('openReports');root.replaceChildren();const {data,error}=await db.from('hc_community_reports').select('id,post_id,reporter_id,reason,details,created_at').eq('status','open').order('created_at',{ascending:true}).limit(100);if(error){root.append(el('p','',humanError(error)));return;}if(!data.length){root.append(el('p','', 'Nenhuma denúncia aberta.'));return;}
  for(const report of data){const post=await db.from('hc_community_posts').select('title,author_name,body,status').eq('id',report.post_id).maybeSingle();const r=row(post.data?.title||'Post removido',report.reason);if(report.details)r.append(el('p','',report.details));if(post.data)r.append(el('small','',`Autor: ${post.data.author_name} · status: ${post.data.status}`));const actions=el('div','admin-actions');actions.append(button('Marcar revisada',()=>finishReport(report,'reviewed')),button('Dispensar',()=>finishReport(report,'dismissed')));r.append(actions);root.append(r);}
}
async function finishReport(report,status){const {error}=await db.from('hc_community_reports').update({status}).eq('id',report.id);if(error){alert(humanError(error));return;}await audit(`report.${status}`,report.reporter_id,{report_id:report.id,post_id:report.post_id});loadReports();}
q('refreshReports').addEventListener('click',loadReports);

function iso(value){return value?new Date(value).toISOString():null;}
q('announcementForm').addEventListener('submit',async e=>{e.preventDefault();const out=q('announcementStatus');if(!contentReady){out.textContent='Backend de anúncios ainda não aplicado.';return;}out.textContent='Publicando…';const payload={title:q('announcementTitle').value.trim(),body:q('announcementBody').value.trim(),level:q('announcementLevel').value,published:q('announcementPublished').checked,created_by:session.user.id};if(q('announcementEnds').value)payload.ends_at=iso(q('announcementEnds').value);const {data,error}=await db.from('hc_announcements').insert(payload).select('id').single();if(error){out.textContent=humanError(error);return;}await audit('announcement.create',null,{announcement_id:data.id,title:payload.title});e.target.reset();q('announcementPublished').checked=true;out.textContent='Anúncio salvo ✓';loadAnnouncements();});
async function loadAnnouncements(){const root=q('announcementList');root.replaceChildren();if(!contentReady){root.append(el('p','', 'Backend de anúncios ainda não aplicado.'));return;}const {data,error}=await db.from('hc_announcements').select('id,title,body,level,published,created_at,ends_at').order('created_at',{ascending:false}).limit(100);if(error){root.append(el('p','',humanError(error)));return;}if(!data.length){root.append(el('p','', 'Nenhum anúncio.'));return;}for(const a of data){const r=row(a.title,a.published?'Publicado':'Rascunho');r.append(el('p','',a.body));const actions=el('div','admin-actions');actions.append(button(a.published?'Despublicar':'Publicar',async()=>{await db.from('hc_announcements').update({published:!a.published}).eq('id',a.id);await audit('announcement.toggle',null,{announcement_id:a.id,published:!a.published});loadAnnouncements();}),button('Excluir',async()=>{if(!confirm('Excluir anúncio?'))return;await db.from('hc_announcements').delete().eq('id',a.id);await audit('announcement.delete',null,{announcement_id:a.id});loadAnnouncements();},'danger-btn'));r.append(actions);root.append(r);}}
q('refreshAnnouncements').addEventListener('click',loadAnnouncements);

q('eventForm').addEventListener('submit',async e=>{e.preventDefault();const out=q('eventStatus');if(!contentReady){out.textContent='Backend de eventos ainda não aplicado.';return;}const payload={title:q('eventTitle').value.trim(),description:q('eventDescription').value.trim(),starts_at:iso(q('eventStarts').value),link_url:q('eventLink').value.trim(),published:q('eventPublished').checked,created_by:session.user.id};if(q('eventEnds').value)payload.ends_at=iso(q('eventEnds').value);const {data,error}=await db.from('hc_events').insert(payload).select('id').single();if(error){out.textContent=humanError(error);return;}await audit('event.create',null,{event_id:data.id,title:payload.title});e.target.reset();q('eventPublished').checked=true;out.textContent='Evento salvo ✓';loadEvents();});
async function loadEvents(){const root=q('eventList');root.replaceChildren();if(!contentReady){root.append(el('p','', 'Backend de eventos ainda não aplicado.'));return;}const {data,error}=await db.from('hc_events').select('id,title,description,starts_at,ends_at,published').order('starts_at',{ascending:true}).limit(100);if(error){root.append(el('p','',humanError(error)));return;}if(!data.length){root.append(el('p','', 'Nenhum evento.'));return;}for(const ev of data){const r=row(ev.title,`${new Date(ev.starts_at).toLocaleString('pt-BR')} · ${ev.published?'publicado':'rascunho'}`);if(ev.description)r.append(el('p','',ev.description));const actions=el('div','admin-actions');actions.append(button(ev.published?'Despublicar':'Publicar',async()=>{await db.from('hc_events').update({published:!ev.published}).eq('id',ev.id);await audit('event.toggle',null,{event_id:ev.id,published:!ev.published});loadEvents();}),button('Excluir',async()=>{if(!confirm('Excluir evento?'))return;await db.from('hc_events').delete().eq('id',ev.id);await audit('event.delete',null,{event_id:ev.id});loadEvents();},'danger-btn'));r.append(actions);root.append(r);}}
q('refreshEvents').addEventListener('click',loadEvents);

await init();