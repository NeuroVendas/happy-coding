'use strict';

const {mkdirSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');

async function main(){
  const input=resolve(__dirname,'..','icon.svg');
  const outDir=resolve(__dirname,'assets');
  const output=resolve(outDir,'happy-coding.ico');
  if(!existsSync(input))throw new Error(`Missing brand icon: ${input}`);
  mkdirSync(outDir,{recursive:true});
  const module=await import('svg-to-ico');
  const convert=module.default||module;
  await convert({input_name:input,output_name:output,sizes:[16,24,32,48,64,128,256]});
  if(!existsSync(output))throw new Error('Windows icon was not generated.');
  console.log(`Happy Coding Windows icon ready: ${output}`);
}

main().catch(error=>{console.error(error);process.exitCode=1;});
