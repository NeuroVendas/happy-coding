'use strict';
(()=>{
  const SUPABASE='https://vzfnoaixjgyifutklpwn.supabase.co';
  const KEY='sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
  const SEARCH_URL=`${SUPABASE}/functions/v1/web-search`;
  const AI_URL=`${SUPABASE}/functions/v1/ai-chat`;
  const HISTORY_KEY='happyCoding.history.v1';
  let requestVersion=0;

  const $=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const clean=raw=>String(raw||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,240);
  function looksLikeAddress(value){const v=String(value||'').trim();if(!v||v==='happy://home')return true;if(/^[a-z][a-z0-9+.-]*:/i.test(v))return true;return /^([a-z0-9-]+\.)+[a-z]{2,}(?::\d{1,5})?(\/.*)?$/i.test(v);}
  function safeUrl(raw){try{const u=new URL(String(raw||''));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return'';}}
  function remember(url,title){try{const list=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');list.unshift({url,title:title||url,at:new Date().toISOString()});localStorage.setItem(HISTORY_KEY,JSON.stringify(list.slice(0,100)));}catch{}}
  function openResult(item){const url=safeUrl(item?.url);if(!url)return;remember(url,item?.title);window.open(url,'_blank','noopener');}

  function ensureView(){
    let section=$('hcSearchV010');if(section)return section;
    section=el('section','view hc-search-v010');section.id='hcSearchV010';section.dataset.viewPanel='search';
    const head=el('div','hc-search-v010-head');
    const copy=el('div');copy.append(el('span','section-kicker','BUSCA HAPPY CODING'),el('h1','','Resposta e resultados'));
    const query=el('p','hc-search-v010-query');query.id='hcSearchV010Query';copy.append(query);
    head.append(copy,el('span','hc-search-v010-safe','● Proteção ativa'));
    const status=el('p','hc-search-v010-status');status.id='hcSearchV010Status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const answer=el('article','hc-answer-card');answer.id='hcSearchV010Answer';
    const results=el('div','hc-search-v010-results');results.id='hcSearchV010Results';
    section.append(head,status,answer,results);$('mainView')?.append(section);return section;
  }
  function showView(query){
    const section=ensureView();
    document.querySelectorAll('[data-view-panel]').forEach(v=>v.classList.remove('active'));
    section.classList.add('active');document.querySelectorAll('[data-view]').forEach(v=>v.classList.remove('active'));
    $('hcSearchV010Query').textContent=`“${query}”`;
    const address=$('addressInput');if(address)address.value=query;
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function renderAnswer(text,label='Resumo das fontes',state='normal'){
    const card=$('hcSearchV010Answer');if(!card)return;card.replaceChildren();card.className=`hc-answer-card ${state}`;
    const top=el('div','hc-answer-top');top.append(el('strong','',state==='blocked'?'Proteção Happy Coding':'=] Resposta'),el('span','hc-answer-label',label));
    const body=el('p','hc-answer-text',text||'Estou preparando uma resposta direta…');card.append(top,body);
  }
  function renderLoading(){
    renderAnswer('Pesquisando fontes e preparando uma resposta…','carregando');
    const root=$('hcSearchV010Results');root.replaceChildren();
    const loading=el('div','hc-search-v010-loading');loading.append(el('i'),el('span','','Buscando resultados seguros…'));root.append(loading);
  }
  function renderResults(results){
    const root=$('hcSearchV010Results');root.replaceChildren();
    if(!Array.isArray(results)||!results.length){root.append(el('p','empty-state','Nenhum resultado abrível encontrado.'));return;}
    results.forEach((item,index)=>{
      const url=safeUrl(item?.url);if(!url)return;
      let host='';try{host=new URL(url).hostname.replace(/^www\./,'');}catch{}
      const card=el('button','hc-result-card');card.type='button';
      const meta=el('span','hc-result-meta',`[${index+1}] ${host}`);const title=el('strong','',String(item?.title||host).slice(0,180));card.append(meta,title);
      if(item?.snippet)card.append(el('p','',String(item.snippet).slice(0,520)));
      card.addEventListener('click',()=>openResult(item));root.append(card);
    });
  }
  async function upgradeWithAI(query,results,version){
    if(!Array.isArray(results)||!results.length)return;
    try{
      const response=await fetch(AI_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({mode:'search',prompt:query,sources:results.slice(0,6)})});
      const data=await response.json().catch(()=>({}));if(version!==requestVersion)return;
      if(response.ok&&data?.reply)renderAnswer(String(data.reply).slice(0,6000),'IA · fontes da busca');
    }catch{}
  }
  function errorBox(message,query){
    const root=$('hcSearchV010Results');root.replaceChildren();const box=el('div','hc-search-v010-error');box.append(el('strong','','Não conseguimos completar a busca.'),el('p','',message));
    const retry=el('button','secondary-btn','Tentar novamente');retry.type='button';retry.addEventListener('click',()=>runSearch(query));box.append(retry);root.append(box);
  }
  async function runSearch(raw){
    const query=clean(raw);if(!query)return;const version=++requestVersion;showView(query);renderLoading();$('hcSearchV010Status').textContent='';
    try{
      const response=await fetch(SEARCH_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({q:query})});
      const payload=await response.json().catch(()=>({}));if(version!==requestVersion)return;
      if(!response.ok){
        if(payload?.error==='blocked_query'){
          $('hcSearchV010Status').textContent='Pesquisa limitada pela proteção';
          renderAnswer(payload?.message||'Não posso ajudar com essa pesquisa.','segurança','blocked');
          $('hcSearchV010Results').replaceChildren();return;
        }
        throw Object.assign(new Error('search_failed'),{status:response.status,payload});
      }
      const results=Array.isArray(payload?.results)?payload.results:[];
      $('hcSearchV010Status').textContent=`${results.length} resultado${results.length===1?'':'s'} · resposta acima`;
      const fallback=payload?.answer?.text;
      renderAnswer(fallback||'Encontrei resultados, mas ainda não há trechos suficientes para um resumo confiável.',fallback?'Resumo das fontes':'Sem resumo suficiente');
      renderResults(results);upgradeWithAI(query,results,version);
    }catch(error){
      if(version!==requestVersion)return;$('hcSearchV010Status').textContent='Busca indisponível';
      renderAnswer('A busca não conseguiu preparar uma resposta agora.','indisponível');
      const message=error?.status===429?'Muitas buscas em pouco tempo. Aguarde um instante e tente novamente.':'Tente novamente em alguns segundos.';errorBox(message,query);
    }
  }
  function intercept(form,input,alwaysSearch){if(!form||!input)return;form.addEventListener('submit',event=>{const value=input.value.trim();if(!value)return;if(!alwaysSearch&&looksLikeAddress(value))return;event.preventDefault();event.stopImmediatePropagation();runSearch(value);},true);}
  intercept($('addressForm'),$('addressInput'),false);intercept($('universalSearch'),$('searchInput'),true);
  window.happySearchV010={run:runSearch};
})();