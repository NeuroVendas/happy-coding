'use strict';

const fs=require('node:fs');
const path=require('node:path');

const EXPECTED_FORGE='7.11.2';
const EXPECTED_PACKAGER='20.0.1';
const MARKER='HC_PACKAGER20_COMPAT_V1';
const root=__dirname;

function findPackageRoot(name,searchPaths){
  const entry=require.resolve(name,{paths:searchPaths});
  let dir=path.dirname(entry);
  while(true){
    const manifest=path.join(dir,'package.json');
    if(fs.existsSync(manifest)){
      try{
        const json=JSON.parse(fs.readFileSync(manifest,'utf8'));
        if(json.name===name)return dir;
      }catch{}
    }
    const parent=path.dirname(dir);
    if(parent===dir)break;
    dir=parent;
  }
  throw new Error(`Could not resolve package root for ${name}.`);
}

function packageVersion(dir){
  return JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8')).version;
}

function patchSource(source){
  if(source.includes(MARKER))return{source,changed:false};
  const legacy=/function hidePromiseFromPromisify\(fn\) \{\s*return \(\.\.\.args\) => \{\s*void fn\(\.\.\.args\);\s*\};\s*\}/m;
  if(!legacy.test(source))throw new Error('Forge callback bridge did not match the reviewed 7.11.2 source. Refusing to patch unknown code.');
  const replacement=`function hidePromiseFromPromisify(fn) {
    /* ${MARKER}: adapt Forge 7 callback hooks to Packager 20 promise hooks. */
    return (...args) => {
        const invokeLegacy = (legacyArgs) => new Promise((resolve, reject) => {
            let settled = false;
            const done = (err) => {
                if (settled) return;
                settled = true;
                if (err) reject(err);
                else resolve();
            };
            try {
                const result = fn(...legacyArgs, done);
                if (result && typeof result.then === 'function') result.catch(done);
            }
            catch (error) {
                done(error);
            }
        });
        if (args.length === 1 && Array.isArray(args[0])) {
            return invokeLegacy([args[0]]);
        }
        if (args.length === 1 && args[0] && typeof args[0] === 'object') {
            const { buildPath, electronVersion, platform, arch } = args[0];
            if (typeof buildPath === 'string') {
                return invokeLegacy([buildPath, electronVersion, platform, arch]);
            }
        }
        void fn(...args);
    };
}`;
  return{source:source.replace(legacy,replacement),changed:true};
}

function main(){
  const forgeRoot=findPackageRoot('@electron-forge/core',[root]);
  const packagerRoot=findPackageRoot('@electron/packager',[forgeRoot,root]);
  const target=path.join(forgeRoot,'dist','api','package.js');
  if(!fs.existsSync(target))throw new Error(`Forge package implementation not found: ${target}`);
  const forgeVersion=packageVersion(forgeRoot);
  const packagerVersion=packageVersion(packagerRoot);
  if(forgeVersion!==EXPECTED_FORGE)throw new Error(`Compatibility patch reviewed only for @electron-forge/core ${EXPECTED_FORGE}; found ${forgeVersion}.`);
  if(packagerVersion!==EXPECTED_PACKAGER)throw new Error(`Compatibility patch reviewed only for @electron/packager ${EXPECTED_PACKAGER}; found ${packagerVersion}.`);
  const before=fs.readFileSync(target,'utf8');
  const patched=patchSource(before);
  if(patched.changed){
    fs.writeFileSync(target,patched.source,'utf8');
    console.log(`Applied ${MARKER} for Forge ${forgeVersion} + Packager ${packagerVersion}.`);
  }else{
    console.log(`${MARKER} already applied.`);
  }
}

if(require.main===module)main();
module.exports={patchSource,findPackageRoot,EXPECTED_FORGE,EXPECTED_PACKAGER,MARKER};
