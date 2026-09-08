'use strict';

const API='https://vzfnoaixjgyifutklpwn.supabase.co/rest/v1/';
const KEY='sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';

async function get(path){
  const response=await fetch(API+path,{headers:{apikey:KEY,Accept:'application/json'}});
  if(!response.ok)throw new Error(String(response.status));
  return response.json();
}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};

function installStyles(){
  if(document.getElementById('hcPublicFeedStyles'))return;
  const s=document.createElement('style');s.id='hcPublicFeedStyles';s.textContent=`
  .hc-public-feed{display:grid;gap:10px;margin:0 0 22px}.hc-notice{border:1px solid #33402d;background:#111710;border-radius:14px;padding:14px 16px}.hc-notice strong{display:block;margin-bottom:5px}.hc-notice p{margin:0;color:#b7c0c9;line-height:1.5}.hc-notice small{display:block;margin-top:7px;color:#889383}.hc-notice[data-level="warning"]{border-color:#7a6330}.hc-event-link{display:inline-block;margin-top:9px;color:#b7f34a;text-decoration:none}.hc-event-link:hover{text-decoration:underline}`;document.head.append(s);
}

async function render(){
  const home=document.querySelector('[data-view-panel="home"]');if(!home||document.getElementById('hcPublicFeed'))return;
  try{
    const [announcements,events]=await Promise.all([
      get('hc_announcements?select=id,title,body,level,starts_at,ends_at&published=eq.true&order=created_at.desc&limit=3'),
      get('hc_events?select=id,title,description,starts_at,ends_at,link_url&published=eq.true&order=starts_at.asc&limit=3')
    ]);
    if(!announcements.length&&!events.length)return;
    installStyles();const root=el('section','hc-public-feed');root.id='hcPublicFeed';
    for(const item of announcements){const card=el('article','hc-notice');card.dataset.level=item.level||'info';card.append(el('strong','',item.title),el('p','',item.body));root.append(card);}
    for(const item of events){const card=el('article','hc-notice');card.append(el('strong','',`Evento · ${item.title}`),el('p','',item.description||''));if(item.starts_at)card.append(el('small','',`Começa: ${new Date(item.starts_at).toLocaleString('pt-BR')}`));if(item.link_url){const a=document.createElement('a');a.className='hc-event-link';a.href=item.link_url;a.target='_blank';a.rel='noopener';a.textContent='Abrir evento ↗';card.append(a);}root.append(card);}
    const anchor=home.querySelector('.hero')||home.firstElementChild;anchor?.after(root);
  }catch{/* Backend de anúncios/eventos ainda pode não estar aplicado. */}
}
render();
document.addEventListener('happy:view',e=>{if(e.detail==='home')render();});
