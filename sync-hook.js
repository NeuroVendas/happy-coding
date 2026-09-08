(()=>{
  'use strict';
  const AUTH_KEY='happyCoding.community.auth.v1';
  const originalSet=Storage.prototype.setItem;
  const originalRemove=Storage.prototype.removeItem;
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