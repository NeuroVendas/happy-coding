'use strict';
const {randomUUID}=require('node:crypto');
const MAX_PROJECTS=100,MAX_LINKS=10;
function text(value,max){return typeof value==='string'?value.slice(0,max):'';}
function webUrl(value){try{const url=new URL(text(value,4096));return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
function repository(value){
  try{const url=new URL(text(value,500));if(url.protocol!=='https:'||url.hostname!=='github.com'||url.port||url.username||url.password||url.search||url.hash)return'';
    const parts=url.pathname.replace(/\/$/,'').split('/').filter(Boolean);
    return parts.length===2&&parts.every(p=>/^[A-Za-z0-9_.-]+$/.test(p)&&p!=='.'&&p!=='..')?`https://github.com/${parts.join('/')}`:'';
  }catch{return'';}
}
function normalizeProject(raw){
  if(!raw||typeof raw.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(raw.id))return null;
  const links=[...new Set((Array.isArray(raw.links)?raw.links:[]).map(webUrl).filter(Boolean))].slice(0,MAX_LINKS);
  return{id:raw.id,name:text(raw.name,80).trim()||'Meu projeto',notes:text(raw.notes,20000),repository:repository(raw.repository),links,godotProject:text(raw.godotProject,4096),updatedAt:Number.isFinite(raw.updatedAt)?raw.updatedAt:0};
}
function normalizeStore(raw){
  const seen=new Set(),projects=[];
  for(const p of Array.isArray(raw?.projects)?raw.projects:[]){const clean=normalizeProject(p);if(clean&&!seen.has(clean.id)){seen.add(clean.id);projects.push(clean);}if(projects.length>=MAX_PROJECTS)break;}
  return{version:1,godotExecutable:text(raw?.godotExecutable,4096),projects};
}
function newProject(name){return normalizeProject({id:randomUUID(),name,updatedAt:Date.now()});}
function updateProject(project,values){
  // Renderer cannot supply file paths or change ownership of a saved project.
  return normalizeProject({...project,name:values?.name,notes:values?.notes,repository:values?.repository,links:values?.links,updatedAt:Date.now()});
}
module.exports={MAX_PROJECTS,MAX_LINKS,webUrl,repository,normalizeProject,normalizeStore,newProject,updateProject};
