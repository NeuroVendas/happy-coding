const $ = id => document.getElementById(id);
const URL_BASE = 'https://vzfnoaixjgyifutklpwn.supabase.co';
// Public client key only. Authorization is enforced by database policies.
const PUBLIC_KEY = 'sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
const SITE_URL = 'https://neurovendas.github.io/happy-coding/';
let clientPromise, user = null, moderator = false, reviewing = false, page = 0, requestVersion = 0;
const PAGE_SIZE = 20;
const kinds = {discussion:'Conversa',code:'Código',project:'Projeto'};
const statuses = {pending:'Em revisão',published:'Publicado',rejected:'Não aprovado'};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(text !== undefined) node.textContent = text;
  return node;
}
function button(text, handler, className='secondary-btn') {
  const node = element('button',className,text); node.type='button';node.addEventListener('click',handler);return node;
}
function message(error) {
  const code = error?.code || '';
  if(code==='invalid_credentials') return 'E-mail ou senha incorretos.';
  if(code==='email_not_confirmed') return 'Confirme seu e-mail antes de entrar.';
  if(code==='email_address_not_authorized') return 'O envio de e-mails ainda está em teste. Cadastros públicos precisam da configuração de e-mail do projeto.';
  if(code.includes('rate_limit')||code==='P0001') return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
  if(code==='23514') return 'Confira o tamanho e os campos do post.';
  if(code==='42501') return 'Sua conta não tem permissão para esta ação. Confira se está conectado.';
  return 'Não foi possível concluir. Verifique sua conexão e tente novamente.';
}
async function client() {
  if(!clientPromise) clientPromise = (async()=>{
    const {createClient} = await import('https://esm.sh/@supabase/supabase-js@2.116.0');
    const db = createClient(URL_BASE,PUBLIC_KEY,{auth:{storage:sessionStorage,storageKey:'happyCoding.community.auth.v1',detectSessionInUrl:true}});
    db.auth.onAuthStateChange((event,session)=>{
      user=session?.user||null;
      if(event==='SIGNED_OUT'){$('communityFeed').replaceChildren();moderator=false;reviewing=false;}
      // Keep async SDK calls outside the auth callback's lock.
      setTimeout(()=>syncAccount(db).then(()=>{
        if(event==='PASSWORD_RECOVERY') passwordDialog(db);
        if(document.querySelector('[data-view-panel="community"].active')) loadFeed();
      }).catch(()=>{}),0);
    });
    const {data,error}=await db.auth.getSession();if(error)throw error;user=data.session?.user||null;
    await syncAccount(db);return db;
  })().catch(error=>{clientPromise=null;throw error;});
  return clientPromise;
}
async function syncAccount(db) {
  moderator=false;
  if(user){const {data,error}=await db.from('hc_admin_members').select('user_id').eq('user_id',user.id);moderator=!error&&data?.length===1;}
  if(!moderator)reviewing=false;
  $('communityAccount').textContent=user?'Minha conta':'Entrar / criar conta';
  $('communityModerate').classList.toggle('hidden',!moderator);
}
async function loadFeed(more=false) {
  const version=++requestVersion;
  if(!more){page=0;$('communityFeed').replaceChildren();}
  $('communityMore').classList.add('hidden');
  $('communityStatus').textContent='Carregando comunidade…';
  try {
    const db=await client(); if(version!==requestVersion)return;
    const filter=$('communityFilter').value;
    if(filter==='mine'&&!user){$('communityStatus').textContent='Entre na sua conta para ver seus envios.';return;}
    let query=db.from('hc_community_posts').select('*').order('created_at',{ascending:false}).order('id',{ascending:false});
    if(reviewing&&moderator) query=query.eq('status','pending');
    else if(filter==='mine')query=query.eq('author_id',user.id);
    else query=query.eq('status','published');
    if(kinds[filter])query=query.eq('kind',filter);
    const {data,error}=await query.range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
    if(error)throw error;if(version!==requestVersion)return;
    data.forEach(post=>$('communityFeed').append(postCard(post,db)));
    $('communityStatus').textContent=reviewing?'Fila de revisão: confira texto e código antes de aprovar.':filter==='mine'?'Seus envios e o andamento da revisão.':'';
    if(!data.length&&!more)$('communityFeed').append(element('p','empty-state',reviewing?'Nenhum post aguardando revisão.':filter==='mine'?'Você ainda não enviou um post.':'Ainda não há posts publicados. Compartilhe o que está criando: seu envio aparecerá depois da revisão.'));
    page++;$('communityMore').classList.toggle('hidden',data.length<PAGE_SIZE);
  }catch(error){if(version===requestVersion)$('communityStatus').textContent=message(error);}
}
function postCard(post,db) {
  const card=element('article','community-post');
  const header=element('header');header.append(element('span','',`${post.author_name} · ${new Date(post.created_at).toLocaleDateString('pt-BR')}`),element('span','post-kind',`${kinds[post.kind]}${post.status!=='published'?' · '+statuses[post.status]:''}`));
  card.append(header);
  const content=element('div');
  const showContent=()=>{
    content.replaceChildren(element('h2','',post.title),element('p','post-body',post.body));
    if(post.code){const pre=element('pre','post-code');pre.append(element('code','',post.code));content.append(pre,button('Copiar código',async()=>{try{await navigator.clipboard.writeText(post.code);window.toast('Código copiado.');}catch{window.toast('Selecione o código e copie pelo menu do navegador.');}}));}
  };
  if(post.content_warning&&!reviewing){const warning=element('div','post-warning','Este post pode conter violência fictícia, terror ou linguagem forte em jogos.');warning.append(document.createElement('br'),button('Ver conteúdo',showContent));content.append(warning);}else showContent();
  card.append(content);
  const actions=element('footer','post-actions');
  if(user?.id===post.author_id)actions.append(button('Excluir meu post',async()=>{
    if(!confirm('Excluir este post da comunidade?'))return;
    const {data,error}=await db.from('hc_community_posts').delete().eq('id',post.id).select('id');
    if(error||!data?.length){window.toast(message(error));return;}loadFeed();
  }));
  if(moderator) for(const [label,status] of [['Aprovar','published'],['Retirar / rejeitar','rejected']])actions.append(button(label,async()=>{
    if(status==='published'&&!confirm('Você revisou o texto e o código e confirmou que seguem as regras da comunidade?'))return;
    const {data,error}=await db.from('hc_community_posts').update({status}).eq('id',post.id).select('id');
    if(error||!data?.length){window.toast(message(error));return;}loadFeed();
  }));
  card.append(actions);return card;
}
function dialog(title) {
  const d=element('dialog','community-dialog');d.setAttribute('aria-label',title);
  d.append(element('h2','',title),button('×',()=>d.close(),'dialog-close'));
  d.lastChild.setAttribute('aria-label','Fechar');
  d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();return d;
}
function field(form,label,tag='input',options={}) {
  const wrapper=element('label','',label),input=element(tag);Object.assign(input,options);wrapper.append(input);form.append(wrapper);return input;
}
function statusLine(form){const p=element('p','form-status');p.setAttribute('role','status');form.append(p);return p;}
async function accountDialog() {
  const d=dialog('Sua conta Happy Coding');
  const status=element('p','','Conectando…');d.append(status);
  let db;try{db=await client();}catch(error){status.textContent=message(error);return;}
  status.remove();if(!d.isConnected)return;
  if(user){
    d.append(element('p','',`Conectado como ${user.email}. A sessão fica nesta aba.`));
    const id=element('p','community-account-id','ID da sua conta: ');id.append(element('code','',user.id));d.append(id);
    d.append(button('Sair da conta',async()=>{const {error}=await db.auth.signOut({scope:'local'});if(error){window.toast(message(error));return;}d.close();}));
    const details=element('details'),summary=element('summary','','Proteção em duas etapas');details.append(summary,element('p','','Use um aplicativo autenticador. A revisão de posts exige conta autorizada e verificação em duas etapas.'));
    details.append(button('Configurar / verificar',async event=>{event.target.disabled=true;try{await mfaDialog(db);}catch(error){window.toast(message(error));}finally{event.target.disabled=false;}}));d.append(details);return;
  }
  d.append(element('p','','Você pode explorar sem conta. Para enviar posts, entre com seu e-mail e senha.'));
  d.append(element('p','','Cadastro e recuperação de senha estão em teste: o envio de e-mails para o público ainda depende da configuração de e-mail do projeto.'));
  const form=element('form');d.append(form);
  const email=field(form,'E-mail','input',{type:'email',required:true,autoComplete:'email',maxLength:254});
  const password=field(form,'Senha','input',{type:'password',required:true,autoComplete:'current-password',minLength:8,maxLength:128});
  const actions=element('div','dialog-actions'),login=button('Entrar',()=>{},'primary-btn');login.type='submit';actions.append(login);form.append(actions);
  const statusText=statusLine(form);
  form.addEventListener('submit',async event=>{event.preventDefault();login.disabled=true;statusText.textContent='Entrando…';try{const {error}=await db.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error)throw error;d.close();loadFeed();}catch(error){statusText.textContent=message(error);}finally{login.disabled=false;}});
  actions.append(button('Criar conta',async event=>{
    if(!form.reportValidity())return;event.target.disabled=true;statusText.textContent='Solicitando cadastro…';
    try{const {data,error}=await db.auth.signUp({email:email.value.trim(),password:password.value,options:{emailRedirectTo:SITE_URL}});if(error)throw error;statusText.textContent=data.session?'Conta criada. Você já pode enviar um post.':'Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Verifique também o spam.';if(data.session){d.close();loadFeed();}}catch(error){statusText.textContent=message(error);}finally{event.target.disabled=false;}
  }));
  actions.append(button('Esqueci a senha',async event=>{
    if(!email.reportValidity())return;event.target.disabled=true;
    try{const {error}=await db.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:SITE_URL});if(error)throw error;statusText.textContent='Se a conta existir e o envio estiver disponível, você receberá instruções por e-mail.';}catch(error){statusText.textContent=message(error);}finally{event.target.disabled=false;}
  }));
}
function passwordDialog(db){
  const d=dialog('Definir nova senha'),form=element('form');d.append(form);
  const password=field(form,'Nova senha','input',{type:'password',required:true,minLength:8,maxLength:128,autoComplete:'new-password'});
  const save=button('Salvar senha',()=>{},'primary-btn');save.type='submit';form.append(save);const status=statusLine(form);
  form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;const {error}=await db.auth.updateUser({password:password.value});save.disabled=false;if(error){status.textContent=message(error);return;}d.close();window.toast('Senha atualizada.');});
}
async function mfaDialog(db){
  const d=dialog('Verificação em duas etapas');
  const {data,error}=await db.auth.mfa.listFactors();if(error){d.close();throw error;}
  let factor=data.totp.find(f=>f.status==='verified');
  if(!factor){
    // Remove only abandoned TOTP enrollments before retrying setup.
    for(const f of data.totp.filter(f=>f.status==='unverified')){const {error}=await db.auth.mfa.unenroll({factorId:f.id});if(error)throw error;}
    const enrolled=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'Happy Coding'});if(enrolled.error){d.close();throw enrolled.error;}factor=enrolled.data;
    d.append(element('p','','Adicione esta chave ao seu aplicativo autenticador e digite o código gerado. Não compartilhe a chave.'));
    d.append(element('code','',factor.totp.secret));
  }
  const form=element('form');d.append(form);const code=field(form,'Código do autenticador','input',{required:true,inputMode:'numeric',pattern:'[0-9]{6}',maxLength:6,autoComplete:'one-time-code'});
  const submit=button('Verificar',()=>{},'primary-btn');submit.type='submit';form.append(submit);const status=statusLine(form);
  form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{const {error}=await db.auth.mfa.challengeAndVerify({factorId:factor.id,code:code.value});if(error)throw error;await syncAccount(db);d.close();loadFeed();window.toast(moderator?'Acesso à revisão liberado.':'Conta protegida. A função de moderador precisa ser atribuída pelo responsável.');}catch{status.textContent='Código inválido ou expirado. Tente o próximo código do autenticador.';}finally{submit.disabled=false;}});
}
async function compose(){
  let db;try{db=await client();}catch(error){window.toast(message(error));return;}
  if(!user){accountDialog();return;}
  const d=dialog('Compartilhar com a comunidade'),form=element('form');d.append(form);
  const name=field(form,'Nome público','input',{required:true,minLength:2,maxLength:32,placeholder:'Seu nome na comunidade'});
  const kind=field(form,'Tipo de post','select');for(const [value,label]of Object.entries(kinds)){const option=element('option','',label);option.value=value;kind.append(option);}
  const title=field(form,'Título','input',{required:true,minLength:3,maxLength:120});
  const body=field(form,'O que você está criando?','textarea',{required:true,maxLength:5000});
  const code=field(form,'Código (opcional, até 20 mil caracteres)','textarea',{maxLength:20000,spellcheck:false});
  const warningLabel=element('label','check-label'),warning=element('input');warning.type='checkbox';warningLabel.append(warning,document.createTextNode('Este post inclui violência fictícia, terror ou linguagem forte em jogos. Mostrar aviso antes da leitura.'));form.append(warningLabel);
  form.append(element('p','','Sem conteúdo adulto explícito, ataques a pessoas ou dados pessoais. Não cole senhas ou chaves de API. Seu envio ficará privado para você e a revisão até ser aprovado.'));
  const submit=button('Enviar para revisão',()=>{},'primary-btn');submit.type='submit';form.append(submit);const status=statusLine(form);
  form.addEventListener('submit',async event=>{
    event.preventDefault();submit.disabled=true;status.textContent='Enviando…';
    try{const {error}=await db.from('hc_community_posts').insert({author_id:user.id,author_name:name.value.trim(),kind:kind.value,title:title.value.trim(),body:body.value.trim(),code:code.value,content_warning:warning.checked});if(error)throw error;d.close();reviewing=false;$('communityFilter').value='mine';loadFeed();window.toast('Post enviado para revisão.');}catch(error){status.textContent=message(error);}finally{submit.disabled=false;}
  });
}
$('communityWrite').addEventListener('click',compose);
$('communityAccount').addEventListener('click',accountDialog);
$('communityFilter').addEventListener('change',()=>{reviewing=false;loadFeed();});
$('communityRefresh').addEventListener('click',()=>loadFeed());
$('communityMore').addEventListener('click',()=>loadFeed(true));
$('communityModerate').addEventListener('click',()=>{reviewing=!reviewing;$('communityFilter').value='all';loadFeed();});
document.addEventListener('happy:view',event=>{if(event.detail==='community')loadFeed();});
// Process auth links even when the community has not been opened yet.
if(/(?:access_token|error_description|type=recovery)=/.test(location.hash)) client().then(()=>window.showView('community')).catch(()=>window.toast('Não foi possível validar o link de acesso.'));
else if(location.hash==='#community')loadFeed();
