(()=>{
  'use strict';
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    original.call(this,key,value);
    try{
      if(this===localStorage){
        document.dispatchEvent(new CustomEvent('happy:local-data-changed',{detail:{key}}));
      }else if(this===sessionStorage){
        document.dispatchEvent(new CustomEvent('happy:session-data-changed',{detail:{key}}));
      }
    }catch{}
  };
})();