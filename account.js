const URL_BASE='https://vzfnoaixjgyifutklpwn.supabase.co';
const KEY='sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
const SITE_URL='https://neurovendas.github.io/happy-coding/';
const STORAGE_KEY='happyCoding.community.auth.v1';
const SYNC_KEY='happyCoding.cloudSync.enabled.v1';
const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
const db=createClient(URL_BASE,KEY,{auth:{storage:sessionStorage,storageKey:STORAGE_KEY,detectSessionInUrl:true}});
const q=id=>document.getElementById(id);
let session=null;

function msg(error){
  const code=error?.code||'';
  if(code==='invalid_credentials')return'E-mail ou senha incorretos.';
  if(code==='email_not_confirmed')return'Confirme seu e-mail antes de entrar.';
  if(code.includes('rate_limit'))return'Muitas tentativas. Aguarde um pouco.';
  return'Não foi possível concluir agora.';
}
function decodeAal(token){
  try{const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const json=JSON.parse(atob(part.padEnd(part.length+(4-part.length%4)%4,'=')));return json.aal||'aal1';}catch{return'aal1';}
}
function setSignedIn(value){q('signedIn').classList.toggle('hidden',!value);q('signedOut').classList.toggle('hidden',value);}
function syncEnabled(){return localStorage.getItem(SYNC_KEY)==='true';}
function renderSync(){q('syncToggle').textContent=syncEnabled()?'Desativar sincronização':'Ativar sincronização';q('syncStatus').textContent=syncEnabled()?'Ativa. Ao voltar ao Happy Coding, os dados sincronizáveis serão atualizados.':'Desativada por padrão.';}
async function ensureDirectory(){
  if(!session?.user)return;
  try{await db.from('hc_user_directory').upsert({user_id:session.user.id,email:session.user.email,last_seen_at:new Date().toISOString()},{onConflict:'user_id'});}catch{}
}
async function loadProfile(){
  if(!session?.user)return;
  const {data}=await db.from('hc_profiles').select('display_name').eq('user_id',session.user.id).maybeSingle();
  q('displayName').value=data?.display_name||'';
}
async function refreshAdminLink(){
  q('adminLink').classList.add('hidden');
  if(!session||decodeAal(session.access_token)!=='aal2')return;
  const {data,error}=await db.from('hc_admin_members').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(!error&&data)q('adminLink').classList.remove('hidden');
}
async function refreshMfa(){
  if(!session)return;
  const {data,error}=await db.auth.mfa.listFactors();
  if(error){q('mfaState').textContent='Não foi possível verificar o MFA.';return;}
  const verified=data.totp.filter(f=>f.status==='verified');
  const aal=decodeAal(session.access_token);
  q('mfaState').textContent=verified.length?`Autenticador configurado · sessão ${aal.toUpperCase()}`:'MFA ainda não configurado.';
}
async function render(){
  const {data,error}=await db.auth.getSession();
  if(error){q('accountStatus').textContent='Não foi possível ler sua sessão.';return;}
  session=data.session;
  setSignedIn(!!session);
  q('accountStatus').textContent=session?'Conta conectada.':'Nenhuma conta conectada.';
  if(!session)return;
  q('emailState').textContent=`Conectado como ${session.user.email}`;
  renderSync();await Promise.allSettled([loadProfile(),refreshMfa(),refreshAdminLink(),ensureDirectory()]);
}

q('authForm').addEventListener('submit',async e=>{
  e.preventDefault();q('authStatus').textContent='Entrando…';
  const {error}=await db.auth.signInWithPassword({email:q('email').value.trim(),password:q('password').value});
  if(error){q('authStatus').textContent=msg(error);return;}await render();
});
q('signupBtn').addEventListener('click',async()=>{
  if(!q('authForm').reportValidity())return;q('authStatus').textContent='Criando conta…';
  const {data,error}=await db.auth.signUp({email:q('email').value.trim(),password:q('password').value,options:{emailRedirectTo:SITE_URL}});
  if(error){q('authStatus').textContent=msg(error);return;}
  q('authStatus').textContent=data.session?'Conta criada e conectada.':'Confira seu e-mail para confirmar a conta.';if(data.session)await render();
});
q('resetBtn').addEventListener('click',async()=>{
  if(!q('email').reportValidity())return;const {error}=await db.auth.resetPasswordForEmail(q('email').value.trim(),{redirectTo:SITE_URL});q('authStatus').textContent=error?msg(error):'Se a conta existir, o Supabase enviará as instruções disponíveis.';
});
q('profileForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!session)return;const name=q('displayName').value.trim();if(!name){q('profileStatus').textContent='Digite um nome.';return;}
  const {error}=await db.from('hc_profiles').upsert({user_id:session.user.id,display_name:name},{onConflict:'user_id'});
  q('profileStatus').textContent=error?'Não foi possível salvar.':'Perfil salvo ✓';
});
q('syncToggle').addEventListener('click',()=>{localStorage.setItem(SYNC_KEY,String(!syncEnabled()));renderSync();});
q('logoutBtn').addEventListener('click',async()=>{await db.auth.signOut({scope:'local'});session=null;await render();});

q('mfaBtn').addEventListener('click',async()=>{
  q('mfaSetup').replaceChildren();q('mfaStatus').textContent='Preparando…';
  const listed=await db.auth.mfa.listFactors();if(listed.error){q('mfaStatus').textContent='Não foi possível abrir o MFA.';return;}
  let factor=listed.data.totp.find(f=>f.status==='verified');
  if(!factor){
    for(const f of listed.data.totp.filter(f=>f.status==='unverified'))await db.auth.mfa.unenroll({factorId:f.id}).catch(()=>{});
    const enrolled=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'Happy Coding'});if(enrolled.error){q('mfaStatus').textContent='Não foi possível gerar o autenticador.';return;}factor=enrolled.data;
    const p=document.createElement('p');p.textContent='Escaneie o QR no seu autenticador. Se preferir, use a chave abaixo.';q('mfaSetup').append(p);
    if(factor.totp.qr_code){const img=document.createElement('img');img.className='qr';img.src=factor.totp.qr_code;img.alt='QR Code para configurar o Happy Coding no aplicativo autenticador';q('mfaSetup').append(img);}
    const secret=document.createElement('code');secret.className='secret';secret.textContent=factor.totp.secret;q('mfaSetup').append(secret);
  }
  const label=document.createElement('label');label.textContent='Código de 6 dígitos';const input=document.createElement('input');input.inputMode='numeric';input.pattern='[0-9]{6}';input.maxLength=6;input.autocomplete='one-time-code';label.append(input);
  const button=document.createElement('button');button.className='primary-btn';button.type='button';button.textContent='Verificar';q('mfaSetup').append(label,button);q('mfaStatus').textContent=factor.status==='verified'?'Digite o código atual para elevar esta sessão para AAL2.':'Digite o código atual para concluir o MFA.';
  button.addEventListener('click',async()=>{if(!input.reportValidity())return;button.disabled=true;const result=await db.auth.mfa.challengeAndVerify({factorId:factor.id,code:input.value});button.disabled=false;if(result.error){q('mfaStatus').textContent='Código inválido ou expirado.';return;}const refreshed=await db.auth.getSession();session=refreshed.data.session;q('mfaStatus').textContent='MFA verificado ✓';q('mfaSetup').replaceChildren();await Promise.all([refreshMfa(),refreshAdminLink()]);});
});

q('deleteAccount').addEventListener('click',async()=>{
  const out=q('deleteStatus');if(q('deleteConfirm').value!=='EXCLUIR'){out.textContent='Digite EXCLUIR exatamente.';return;}if(!session){out.textContent='Nenhuma conta conectada.';return;}if(!confirm('Excluir sua conta Happy Coding permanentemente?'))return;
  out.textContent='Excluindo…';const {data,error}=await db.functions.invoke('delete-account',{body:{confirm:'DELETE'}});if(error||data?.error){out.textContent='Não foi possível excluir agora.';return;}await db.auth.signOut({scope:'local'}).catch(()=>{});sessionStorage.removeItem(STORAGE_KEY);out.textContent='Conta excluída.';setTimeout(()=>location.href='./',1000);
});

db.auth.onAuthStateChange(()=>setTimeout(render,0));
await render();
