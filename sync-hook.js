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
})();