#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const [input, out='agent-reports'] = process.argv.slice(2);
if (!input) { console.error('Usage: node scripts/product-agent.mjs <backlog.json> [out]'); process.exit(2); }
const backlog=JSON.parse(await readFile(resolve(input),'utf8'));
if (!Array.isArray(backlog.items)) throw new Error('items must be an array');
const levels=new Set(['critical','high','medium','low']);
const statuses=new Set(['proposed','ready','blocked','in-progress','done']);
const items=backlog.items.map((item,i)=>{
 if (!item || typeof item.id!=='string' || typeof item.title!=='string' || !levels.has(item.priority) || !statuses.has(item.status)) throw new Error('Invalid item at '+i);
 return {id:item.id,title:item.title,priority:item.priority,status:item.status,owner:item.owner??null,dependencies:Array.isArray(item.dependencies)?item.dependencies:[]};
});
const ids=new Set(items.map(x=>x.id));
if(ids.size!==items.length) throw new Error('Duplicate IDs');
for(const item of items) for(const dep of item.dependencies) if(!ids.has(dep)) throw new Error('Unknown dependency '+dep);
const rank={critical:0,high:1,medium:2,low:3};
const sorted=items.map(item=>({...item,actionable:item.status==='ready'&&item.dependencies.every(dep=>items.find(x=>x.id===dep).status==='done')})).sort((a,b)=>rank[a.priority]-rank[b.priority]||a.id.localeCompare(b.id));
await mkdir(out,{recursive:true});
await writeFile(join(out,'product-report.json'),JSON.stringify({department:'product',items:sorted,autoMerge:false,autoDeploy:false},null,2));
console.log('Product backlog analyzed: '+sorted.length);
