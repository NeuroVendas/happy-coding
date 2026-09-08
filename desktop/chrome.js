'use strict';
const address=document.getElementById('address');
document.getElementById('go').addEventListener('submit',async e=>{e.preventDefault();await window.happyDesktop.navigate(address.value);});
document.getElementById('back').addEventListener('click',()=>window.happyDesktop.back());
document.getElementById('forward').addEventListener('click',()=>window.happyDesktop.forward());
document.getElementById('reload').addEventListener('click',()=>window.happyDesktop.reload());
window.happyDesktop.onNavigationState(state=>{address.value=state.url||'happy://home';});