'use strict';

// Turns #search=<query> into the same protected search used by the workspace.
// This is how the Desktop address bar reaches the web-search backend without
// exposing a provider page or maintaining a second search implementation.
(() => {
  let lastQuery='';

  function queryFromLocation(){
    if(!location.hash.startsWith('#search='))return'';
    try{return decodeURIComponent(location.hash.slice(8)).replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,512);}catch{return'';}
  }

  function run(){
    const query=queryFromLocation();
    if(!query||query===lastQuery)return;
    const form=document.getElementById('universalSearch');
    const input=document.getElementById('searchInput');
    if(!(form instanceof HTMLFormElement)||!(input instanceof HTMLInputElement))return;
    lastQuery=query;
    input.value=query;
    form.requestSubmit();
  }

  window.addEventListener('hashchange',()=>queueMicrotask(run));
  if(document.readyState==='complete')run();
  else window.addEventListener('load',run,{once:true});
})();
