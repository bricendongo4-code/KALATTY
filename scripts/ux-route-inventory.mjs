#!/usr/bin/env node
import {readdir,readFile,mkdir,writeFile,lstat} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
const root=resolve(process.argv[2]??'frontend/app');
const out=resolve(process.argv[3]??'agent-reports');
const routes=[];
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name),stat=await lstat(path);
  if(stat.isSymbolicLink())continue;
  if(stat.isDirectory()){await walk(path);continue;}
  if(entry.name!=='page.tsx'&&entry.name!=='page.jsx')continue;
  const source=await readFile(path,'utf8');
  const pathParts=relative(root,dir).split('/').filter(x=>x&&!/^\(.*\)$/.test(x));
  const route='/'+pathParts.join('/');
  const actions=[];
  for(const match of source.matchAll(/<button\b([^>]*)>/g)){
   const attributes=match[1];
   actions.push({label:(attributes.match(/aria-label=["']([^"']+)/)?.[1]??'').trim(),interactive:true,handler:/\bonClick\s*=|\btype=["']submit/.test(attributes),destination:null});
  }
  routes.push({path:route,title:source.match(/<h1[^>]*>([^<]+)</)?.[1]??'',mobileReviewed:false,actions});
 }
}
await walk(root);
await mkdir(out,{recursive:true});
await writeFile(join(out,'route-inventory.json'),JSON.stringify({routes,limitations:'Static heuristic: dynamic labels, components and client navigation need manual browser verification.'},null,2));
console.log('Inventory pages: '+routes.length);
