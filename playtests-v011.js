'use strict';

(async()=>{
  const URL_BASE='https://vzfnoaixjgyifutklpwn.supabase.co';
  const PUBLIC_KEY='sb_publishable_nQTrMmVzLt0b1t0y-Ob22g_UwF1eNDD';
  const AUTH_KEY='happyCoding.community.auth.v1';
  const AI_ENDPOINT=`${URL_BASE}/functions/v1/ai-chat`;
  const $=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const button=(text,handler,cls='secondary-btn')=>{const node=el('button',cls,text);node.type='button';node.addEventListener('click',handler);return node;};
  let dbPromise;
  let loadVersion=0;

  async function db(){
    if(!dbPromise)dbPromise=(async()=>{
      const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
      return createClient(URL_BASE,PUBLIC_KEY,{auth:{storage:localStorage,storageKey:AUTH_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    })().catch(error=>{dbPromise=null;throw error;});
    return dbPromise;
  }
  async function session(){const client=await db();const {data,error}=await client.auth.getSession();if(error)throw error;return data.session||null;}
  async function moderator(client,current){if(!current?.user?.id)return false;const {data,error}=await client.from('hc_admin_members').select('user_id').eq('user_id',current.user.id);return !error&&data?.length===1;}
  function errorMessage(error){
    if(error?.code==='42501')return'Sem permissão para esta ação. Se você é moderador, confirme a verificação em duas etapas na sua conta.';
    if(error?.code==='23514')return'Confira os campos. O link precisa usar HTTPS e os textos devem respeitar os limites.';
    if(error?.code==='P0001')return error.message||'Aguarde antes de enviar novamente.';
    return'Não foi possível concluir agora. Verifique a conexão e tente novamente.';
  }
  function dialog(title){
    const d=el('dialog','community-dialog hc-playtest-dialog');
    d.setAttribute('aria-label',title);
    const close=button('×',()=>d.close(),'dialog-close');close.setAttribute('aria-label','Fechar');
    d.append(el('h2','',title),close);
    d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();return d;
  }
  function field(form,label,tag='input',options={}){const wrap=el('label','',label),input=el(tag);Object.assign(input,options);wrap.append(input);form.append(wrap);return input;}
  function statusLine(form){const p=el('p','form-status');p.setAttribute('role','status');form.append(p);return p;}
  function localProfileName(){try{return JSON.parse(localStorage.getItem('happyCoding.profile.v1')||'{}')?.name||'';}catch{return'';}}
  function localProject(){try{return JSON.parse(localStorage.getItem('happyCoding.projects.v1')||'[]')?.[0]||null;}catch{return null;}}
  async function publicName(client,current){
    if(!current?.user?.id)return'';
    const {data}=await client.from('hc_public_profiles').select('display_name').eq('user_id',current.user.id).maybeSingle();
    return String(data?.display_name||localProfileName()||'').trim().slice(0,40);
  }
  function ensureUI(){
    const toolbar=document.querySelector('.community-toolbar');if(!toolbar||$('hcPlaytests'))return;
    const section=el('section','hc-playtests');section.id='hcPlaytests';
    const head=el('div','hc-playtests-head');const copy=el('div');copy.append(el('span','section-kicker','PLAYTESTS'),el('h2','','Teste projetos reais'),el('p','','Publique uma versão por link HTTPS, peça feedback e acompanhe os relatos no mesmo lugar.'));
    const publish=button('+ Publicar para teste',openCreate,'primary-btn');publish.id='hcPublishPlaytest';head.append(copy,publish);
    const status=el('p','community-note');status.id='hcPlaytestStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const list=el('div','hc-playtest-list');list.id='hcPlaytestList';section.append(head,status,list);
    const anchor=$('communityPeopleResults')||document.querySelector('.community-people-tools')||toolbar;anchor.after(section);
  }
  function statusLabel(value){return({pending:'Em revisão',published:'Aberto para teste',rejected:'Não aprovado'})[value]||value;}
  function feedbackStatus(value){return({open:'Aberto',planned:'Vou corrigir',fixed:'Corrigido'})[value]||value;}
  function playtestCard(playtest,client,current,isMod){
    const card=el('article','community-post hc-playtest-card');
    const header=el('header');header.append(el('span','',`${playtest.creator_name} · ${new Date(playtest.created_at).toLocaleDateString('pt-BR')}`),el('span','post-kind',statusLabel(playtest.status)));card.append(header);
    const title=el('h2','',playtest.project_name);const version=el('span','hc-version',playtest.version_label);title.append(document.createTextNode(' '),version);card.append(title);
    const prompt=el('p','post-body',playtest.feedback_prompt);card.append(prompt);
    if(playtest.instructions){const details=el('details','hc-playtest-instructions'),summary=el('summary','','Instruções de teste');details.append(summary,el('p','post-body',playtest.instructions));card.append(details);}
    if(playtest.content_warning)card.append(el('div','post-warning','Aviso do criador: esta versão pode conter violência fictícia, terror ou linguagem forte em jogos.'));
    const actions=el('footer','post-actions');
    if(playtest.status==='published'){
      actions.append(button('Testar projeto ↗',()=>{const win=window.open(playtest.project_url,'_blank','noopener,noreferrer');if(win)win.opener=null;},'primary-btn'));
      actions.append(button('Enviar relato',()=>openReport(playtest)));
    }
    if(current?.user?.id===playtest.creator_id){
      actions.append(button('Ver feedback',()=>openFeedbacks(playtest)));
      actions.append(button('Excluir publicação',async()=>{if(!confirm('Excluir este playtest e os relatos associados?'))return;const {data,error}=await client.from('hc_playtests').delete().eq('id',playtest.id).select('id');if(error||!data?.length){window.toast?.(errorMessage(error));return;}loadPlaytests();}));
    }
    if(isMod&&playtest.status==='pending'){
      actions.append(button('Aprovar',()=>moderatePlaytest(playtest,'published'), 'primary-btn'));
      actions.append(button('Rejeitar',()=>moderatePlaytest(playtest,'rejected')));
    }
    card.append(actions);return card;
  }
  async function loadPlaytests(){
    ensureUI();const root=$('hcPlaytestList'),status=$('hcPlaytestStatus');if(!root||!status)return;const version=++loadVersion;status.textContent='Carregando playtests…';
    try{
      const client=await db();const current=await session();const isMod=await moderator(client,current);if(version!==loadVersion)return;
      const {data,error}=await client.from('hc_playtests').select('id,creator_id,creator_name,project_name,version_label,project_url,feedback_prompt,instructions,content_warning,status,created_at').order('created_at',{ascending:false}).limit(24);if(error)throw error;if(version!==loadVersion)return;
      root.replaceChildren();for(const item of data||[])root.append(playtestCard(item,client,current,isMod));
      if(!data?.length)root.append(el('p','empty-state','Nenhum playtest publicado ainda. Publique uma versão hospedada em HTTPS e diga exatamente o que quer que as pessoas testem.'));
      status.textContent=current?'Você vê playtests publicados e também seus próprios envios em revisão.':'Entre na conta para enviar feedback ou publicar um teste.';
    }catch(error){status.textContent=errorMessage(error);}
  }
  async function openCreate(){
    let client,current;try{client=await db();current=await session();}catch(error){window.toast?.(errorMessage(error));return;}
    if(!current){$('communityAccount')?.click();return;}
    const d=dialog('Publicar versão para playtest'),form=el('form');d.append(el('p','modal-copy','O Happy Coding não hospeda o build nesta fase. Informe um link HTTPS de uma versão que já esteja publicada. A publicação passa pela moderação existente.'),form);
    const local=localProject();
    const name=field(form,'Seu nome público','input',{required:true,minLength:2,maxLength:40,value:await publicName(client,current)});
    const project=field(form,'Projeto','input',{required:true,minLength:1,maxLength:120,value:String(local?.name||'')});
    const version=field(form,'Versão','input',{required:true,minLength:1,maxLength:80,placeholder:'v0.11.0-preview',value:local?.version&&local.version!=='local'?String(local.version):''});
    const url=field(form,'Link HTTPS da versão','input',{required:true,type:'url',maxLength:2048,placeholder:'https://...'});
    const goal=field(form,'Quero feedback sobre…','textarea',{required:true,maxLength:1000,placeholder:'Ex.: a navegação ficou clara? Você conseguiu concluir o fluxo sem ajuda?'});
    const instructions=field(form,'Instruções de teste (opcional)','textarea',{maxLength:4000,placeholder:'Passos iniciais, conta de demonstração sem senha real, controles do jogo etc.'});
    const warningLabel=el('label','check-label'),warning=el('input');warning.type='checkbox';warningLabel.append(warning,document.createTextNode('Esta versão pode conter violência fictícia, terror ou linguagem forte em jogos. Mostrar aviso.'));form.append(warningLabel);
    form.append(el('p','','Não publique senhas, tokens, builds executáveis ou dados pessoais. Apenas o link e os textos acima serão salvos nesta publicação.'));
    const submit=button('Enviar para revisão',()=>{},'primary-btn');submit.type='submit';form.append(submit);const status=statusLine(form);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!form.reportValidity())return;let parsed;try{parsed=new URL(url.value.trim());}catch{status.textContent='Informe um link HTTPS válido.';return;}if(parsed.protocol!=='https:'){status.textContent='O link do playtest precisa usar HTTPS.';return;}
      submit.disabled=true;status.textContent='Enviando…';
      try{const {error}=await client.from('hc_playtests').insert({creator_id:current.user.id,creator_name:name.value.trim(),project_name:project.value.trim(),version_label:version.value.trim(),project_url:parsed.href,feedback_prompt:goal.value.trim(),instructions:instructions.value.trim(),content_warning:warning.checked,status:'pending'});if(error)throw error;d.close();window.toast?.('Playtest enviado para revisão.');loadPlaytests();}catch(error){status.textContent=errorMessage(error);}finally{submit.disabled=false;}
    });
  }
  async function moderatePlaytest(playtest,next){
    if(next==='published'&&!confirm('Você revisou o link, o texto e o aviso de conteúdo desta publicação?'))return;
    try{const client=await db();const {data,error}=await client.from('hc_playtests').update({status:next}).eq('id',playtest.id).select('id');if(error||!data?.length)throw error||new Error('not_updated');window.toast?.(next==='published'?'Playtest publicado.':'Playtest rejeitado.');loadPlaytests();}catch(error){window.toast?.(errorMessage(error));}
  }
  async function openReport(playtest){
    let client,current;try{client=await db();current=await session();}catch(error){window.toast?.(errorMessage(error));return;}
    if(!current){$('communityAccount')?.click();return;}
    const d=dialog(`Relatar teste · ${playtest.project_name}`),form=el('form');d.append(el('p','modal-copy',`Versão ${playtest.version_label}. Conte o que você tentou fazer e o que realmente aconteceu. O relato ficará visível para você, o criador e moderadores autorizados.`),form);
    const name=field(form,'Seu nome público','input',{required:true,minLength:2,maxLength:40,value:await publicName(client,current)});
    const attempted=field(form,'O que você tentou fazer?','textarea',{required:true,maxLength:1600});
    const happened=field(form,'O que aconteceu?','textarea',{required:true,maxLength:2000});
    const where=field(form,'Onde aconteceu?','input',{required:true,maxLength:800,placeholder:'Ex.: tela de login, fase 2, menu Configurações'});
    const steps=field(form,'Passos para repetir (opcional)','textarea',{maxLength:2500});
    const expected=field(form,'O que você esperava? (opcional)','textarea',{maxLength:1600});
    const actual=field(form,'Resultado real / mensagem vista (opcional)','textarea',{maxLength:1600});
    form.append(el('p','','Não cole senhas, tokens ou dados pessoais. Nenhum arquivo, screenshot, log ou página inteira é enviado automaticamente.'));
    const submit=button('Revisar e enviar relato',()=>{},'primary-btn');submit.type='submit';form.append(submit);const status=statusLine(form);
    form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const payload={playtest_id:playtest.id,tester_id:current.user.id,tester_name:name.value.trim(),attempted:attempted.value.trim(),happened:happened.value.trim(),location:where.value.trim(),steps:steps.value.trim(),expected:expected.value.trim(),actual:actual.value.trim(),status:'open'};reviewReport(client,d,playtest,payload);});
  }
  function reviewReport(client,composeDialog,playtest,payload){
    const d=dialog('Revise o relato antes de enviar');d.append(el('p','modal-copy','Confira exatamente os campos que serão salvos. Você ainda pode voltar sem enviar.'));
    const pre=el('pre','post-code hc-review-json',JSON.stringify({projeto:playtest.project_name,versao:playtest.version_label,relato:{tentou:payload.attempted,aconteceu:payload.happened,onde:payload.location,passos:payload.steps,esperado:payload.expected,resultado_real:payload.actual}},null,2));d.append(pre);
    const actions=el('div','dialog-actions'),back=button('Voltar',()=>d.close()),send=button('Enviar relato',async()=>{},'primary-btn');actions.append(back,send);const status=el('p','form-status');status.setAttribute('role','status');d.append(actions,status);
    send.addEventListener('click',async()=>{send.disabled=true;status.textContent='Enviando…';try{const {error}=await client.from('hc_playtest_feedback').insert(payload);if(error)throw error;d.close();composeDialog.close();window.toast?.('Relato enviado ao criador.');}catch(error){status.textContent=errorMessage(error);}finally{send.disabled=false;}});
  }
  async function openFeedbacks(playtest){
    const d=dialog(`Feedback · ${playtest.project_name}`),status=el('p','form-status','Carregando relatos…'),root=el('div','hc-feedback-list');d.append(status,root);
    try{const client=await db();const current=await session();const isMod=await moderator(client,current);const {data,error}=await client.from('hc_playtest_feedback').select('id,tester_name,attempted,happened,location,steps,expected,actual,status,created_at').eq('playtest_id',playtest.id).order('created_at',{ascending:false});if(error)throw error;status.textContent=`${data?.length||0} relato${data?.length===1?'':'s'}.`;if(!data?.length){root.append(el('p','empty-state','Ainda não há feedback para esta versão.'));return;}for(const report of data)root.append(feedbackCard(client,playtest,report,current,isMod));}catch(error){status.textContent=errorMessage(error);}
  }
  function feedbackCard(client,playtest,report,current,isMod){
    const card=el('article','hc-feedback-card');const head=el('header');head.append(el('strong','',report.tester_name),el('span','post-kind',feedbackStatus(report.status)));card.append(head);
    const rows=[['Tentou',report.attempted],['Aconteceu',report.happened],['Onde',report.location],['Passos',report.steps],['Esperava',report.expected],['Resultado real',report.actual]];for(const [label,value] of rows){if(!value)continue;const row=el('p','hc-feedback-row');row.append(el('b','',`${label}: `),document.createTextNode(value));card.append(row);}
    const actions=el('div','post-actions');actions.append(button('Analisar com IA',()=>openAIReview(playtest,report),'primary-btn'));
    if(current?.user?.id===playtest.creator_id||isMod){
      actions.append(button('Aberto',()=>setFeedbackStatus(client,report.id,'open',card)));
      actions.append(button('Vou corrigir',()=>setFeedbackStatus(client,report.id,'planned',card)));
      actions.append(button('Corrigido',()=>setFeedbackStatus(client,report.id,'fixed',card)));
    }
    card.append(actions);return card;
  }
  async function setFeedbackStatus(client,id,next,card){
    try{const {data,error}=await client.from('hc_playtest_feedback').update({status:next}).eq('id',id).select('id,status');if(error||!data?.length)throw error||new Error('not_updated');card.querySelector('.post-kind').textContent=feedbackStatus(next);window.toast?.('Status do feedback atualizado.');}catch(error){window.toast?.(errorMessage(error));}
  }
  function clipped(value,max){return String(value||'').trim().slice(0,max);}
  function aiRequest(playtest,report){
    const notes=[
      `Tentou fazer: ${clipped(report.attempted,350)}`,
      `Aconteceu: ${clipped(report.happened,500)}`,
      `Onde: ${clipped(report.location,180)}`,
      `Passos: ${clipped(report.steps,450)}`,
      `Esperava: ${clipped(report.expected,300)}`,
      `Resultado real: ${clipped(report.actual,450)}`
    ].join('\n');
    return{mode:'chat',prompt:'Analise o relato de playtest no contexto escolhido. Identifique a causa provável sem inventar fatos, sugira verificações objetivas e proponha próximos passos seguros para reproduzir e corrigir o problema. Se faltarem dados, diga exatamente quais.',history:[],context:{name:clipped(playtest.project_name,120),engine:`Versão ${clipped(playtest.version_label,70)}`,description:clipped(playtest.feedback_prompt,500),notes:clipped(notes,2400)}};
  }
  function openAIReview(playtest,report){
    const request=aiRequest(playtest,report),d=dialog('Revisar dados da análise com IA');
    d.append(el('p','modal-copy','Nada é enviado até você confirmar. Abaixo está o corpo exato da solicitação: sem nome do tester, e-mail, ID da conta, arquivos, screenshots, logs ou conteúdo da página. Campos longos são limitados antes desta prévia.'));
    const pre=el('pre','post-code hc-review-json',JSON.stringify(request,null,2));d.append(pre);
    const actions=el('div','dialog-actions'),cancel=button('Cancelar',()=>d.close()),send=button('Enviar para análise',async()=>{},'primary-btn');actions.append(cancel,send);const status=el('p','form-status');status.setAttribute('role','status');const result=el('div','hc-ai-result');d.append(actions,status,result);
    send.addEventListener('click',async()=>{send.disabled=true;status.textContent='Analisando…';result.replaceChildren();try{const response=await fetch(AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':PUBLIC_KEY},body:JSON.stringify(request)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.message||'A IA não respondeu agora.');result.append(el('h3','','Análise da IA'),el('p','post-body',String(data?.reply||'Não houve resposta.').slice(0,6000)));status.textContent='Análise concluída dentro do Happy Coding.';}catch(error){status.textContent=error?.message||'A IA não respondeu agora.';}finally{send.disabled=false;}});
  }

  ensureUI();
  document.addEventListener('happy:view',event=>{if(event.detail==='community')loadPlaytests();});
  document.addEventListener('happy:session-data-changed',()=>{if(document.querySelector('[data-view-panel="community"]')?.classList.contains('active'))loadPlaytests();});
  if(location.hash==='#community')loadPlaytests();
})();
