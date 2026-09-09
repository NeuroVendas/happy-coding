const URL_BASE='https://vzfnoaixjgyifutklpwn.supabase.co';
const PUBLIC_KEY='sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
const AUTH_KEY='happyCoding.community.auth.v1';
let dbPromise;
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,cls='secondary-btn')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
async function db(){if(!dbPromise)dbPromise=(async()=>{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.116.0');return createClient(URL_BASE,PUBLIC_KEY,{auth:{storage:localStorage,storageKey:AUTH_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});})();return dbPromise;}
async function session(){const client=await db();const {data}=await client.auth.getSession();return data.session||null;}
function dialog(title){const d=el('dialog','community-dialog hc-profile-dialog');const close=button('×',()=>d.close(),'dialog-close');close.setAttribute('aria-label','Fechar');d.append(el('h2','',title),close);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();return d;}
function verifiedBadge(){const badge=el('span','hc-verified','✓ Admin');badge.title='Administrador verificado pelo Happy Coding';return badge;}
function profileCard(profile){const card=el('article','hc-person-card');const top=el('div','hc-person-top');const name=el('strong','',profile.display_name||`@${profile.username}`);top.append(name);if(profile.verified)top.append(verifiedBadge());card.append(top,el('span','hc-person-username',`@${profile.username}`));if(profile.bio)card.append(el('p','',profile.bio));return card;}

function ensurePeopleUI(){
  const toolbar=document.querySelector('.community-toolbar');if(!toolbar||$('communityPeopleTools'))return;
  const tools=el('div','community-people-tools');tools.id='communityPeopleTools';
  const input=el('input','');input.id='communityPeopleSearch';input.placeholder='Buscar pessoas por @username ou nome';input.maxLength=40;input.autocomplete='off';input.setAttribute('aria-label','Buscar pessoas na comunidade');
  const search=button('Buscar pessoas',()=>searchPeople(input.value),'secondary-btn');search.id='communityPeopleBtn';
  const mine=button('Meu perfil público',openMyProfile,'secondary-btn');mine.id='communityPublicProfile';
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchPeople(input.value);}});
  tools.append(input,search,mine);toolbar.after(tools);
  const results=el('div','community-people-results');results.id='communityPeopleResults';tools.after(results);
}
async function searchPeople(raw){
  const root=$('communityPeopleResults');if(!root)return;const query=String(raw||'').trim().replace(/^@/,'').slice(0,40);root.replaceChildren(el('p','form-status','Buscando pessoas…'));
  try{const client=await db();const {data,error}=await client.rpc('hc_search_public_profiles',{p_query:query,p_limit:12});if(error)throw error;root.replaceChildren();if(!data?.length){root.append(el('p','empty-state','Nenhum perfil público encontrado.'));return;}data.forEach(p=>root.append(profileCard(p)));}
  catch{root.replaceChildren(el('p','form-status','Não foi possível buscar pessoas agora.'));}
}
async function openMyProfile(){
  const current=await session();if(!current){$('communityAccount')?.click();return;}
  const client=await db();const {data:existing}=await client.from('hc_public_profiles').select('username,display_name,bio').eq('user_id',current.user.id).maybeSingle();
  const d=dialog('Meu perfil público');d.append(el('p','modal-copy','Seu e-mail nunca aparece aqui. Username, nome e bio ficam públicos para outras pessoas encontrarem você.'));
  const form=el('form');
  const userLabel=el('label','','Username');const username=el('input');username.required=true;username.minLength=3;username.maxLength=24;username.pattern='[A-Za-z0-9_]{3,24}';username.placeholder='seu_nome';username.value=existing?.username||'';userLabel.append(username);
  const nameLabel=el('label','','Nome público');const display=el('input');display.required=true;display.minLength=2;display.maxLength=40;display.value=existing?.display_name||'';nameLabel.append(display);
  const bioLabel=el('label','','Bio (opcional)');const bio=el('textarea');bio.maxLength=280;bio.value=existing?.bio||'';bioLabel.append(bio);
  const save=button('Salvar perfil',()=>{},'primary-btn');save.type='submit';const status=el('p','form-status');status.setAttribute('role','status');form.append(userLabel,nameLabel,bioLabel,save,status);d.append(form);
  form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;save.disabled=true;status.textContent='Salvando…';const payload={username:username.value.trim().toLowerCase(),display_name:display.value.trim(),bio:bio.value.trim()};try{let error;if(existing){({error}=await client.from('hc_public_profiles').update(payload).eq('user_id',current.user.id));}else{({error}=await client.from('hc_public_profiles').insert({user_id:current.user.id,...payload}));}if(error)throw error;status.textContent='Perfil público salvo ✓';setTimeout(()=>d.close(),450);searchPeople(payload.username);decoratePosts();}catch(error){status.textContent=error?.code==='23505'?'Esse @username já está em uso.':'Não foi possível salvar. Use 3–24 letras, números ou _.';}finally{save.disabled=false;}});
}

let decorateTimer;
async function decoratePosts(){
  clearTimeout(decorateTimer);decorateTimer=setTimeout(async()=>{
    const cards=[...document.querySelectorAll('.community-post:not([data-hc-profile-decorated])')];if(!cards.length)return;
    const titles=[...new Set(cards.map(c=>c.querySelector('h2')?.textContent?.trim()).filter(Boolean))].slice(0,50);if(!titles.length)return;
    try{
      const client=await db();const {data:posts,error}=await client.from('hc_community_posts').select('author_id,author_name,title,created_at').in('title',titles).limit(100);if(error||!posts?.length)return;
      const ids=[...new Set(posts.map(p=>p.author_id))];const {data:profiles,error:profileError}=await client.rpc('hc_public_profiles_by_ids',{p_ids:ids});if(profileError)return;const profileMap=new Map((profiles||[]).map(p=>[p.user_id,p]));
      for(const card of cards){
        const title=card.querySelector('h2')?.textContent?.trim();const visibleAuthor=card.querySelector('header > span:first-child')?.textContent?.trim()||'';
        const matches=posts.filter(p=>p.title===title&&`${p.author_name} · ${new Date(p.created_at).toLocaleDateString('pt-BR')}`===visibleAuthor);
        const authorIds=[...new Set(matches.map(p=>p.author_id).filter(Boolean))];
        if(authorIds.length!==1)continue;
        const profile=profileMap.get(authorIds[0]);const header=card.querySelector('header');
        if(header&&profile){const meta=el('span','hc-post-author-meta');if(profile.username)meta.append(el('span','hc-author-username',`@${profile.username}`));if(profile.verified)meta.append(verifiedBadge());if(meta.childNodes.length)header.insertBefore(meta,header.lastElementChild);}
        card.dataset.hcProfileDecorated='1';
      }
    }catch{}
  },80);
}

ensurePeopleUI();const feed=$('communityFeed');if(feed)new MutationObserver(decoratePosts).observe(feed,{childList:true,subtree:true});decoratePosts();
document.addEventListener('happy:view',event=>{if(event.detail==='community'){ensurePeopleUI();decoratePosts();}});
document.addEventListener('happy:session-data-changed',()=>{decoratePosts();});