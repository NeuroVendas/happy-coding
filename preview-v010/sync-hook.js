(()=>{
  'use strict';
  const AUTH_KEY='happyCoding.community.auth.v1';
  const originalSet=Storage.prototype.setItem;
  const originalRemove=Storage.prototype.removeItem;

  // One-time migration from the old tab-only auth storage. Once copied, remove
  // the legacy value so cloud sync cannot accidentally prefer a stale token.
  try{
    const legacy=sessionStorage.getItem(AUTH_KEY);
    if(legacy&&!localStorage.getItem(AUTH_KEY))originalSet.call(localStorage,AUTH_KEY,legacy);
    if(legacy)originalRemove.call(sessionStorage,AUTH_KEY);
  }catch{}

  const emit=(storage,key)=>{
    try{
      if(storage===localStorage){
        document.dispatchEvent(new CustomEvent('happy:local-data-changed',{detail:{key}}));
        if(key===AUTH_KEY)document.dispatchEvent(new CustomEvent('happy:session-data-changed',{detail:{key}}));
      }else if(storage===sessionStorage){
        document.dispatchEvent(new CustomEvent('happy:session-data-changed',{detail:{key}}));
      }
    }catch{}
  };
  Storage.prototype.setItem=function(key,value){
    originalSet.call(this,key,value);
    emit(this,key);
  };
  Storage.prototype.removeItem=function(key){
    originalRemove.call(this,key);
    emit(this,key);
  };

  // v0.10 loads before app.js so its capture-phase search and cloud-AI handlers
  // can replace the old local-model/search behavior without exposing native APIs.
  if(!document.querySelector('link[data-hc-v010]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='v010.css';css.dataset.hcV010='1';document.head.append(css);
  }
  if(document.readyState==='loading'){
    document.write('<script src="search-v010.js"><\/script>');
    document.write('<script src="cloud-ai.js"><\/script>');
    document.write('<script src="v010-cleanup.js"><\/script>');
    document.write('<script type="module" src="community-v010.js"><\/script>');
  }
})();