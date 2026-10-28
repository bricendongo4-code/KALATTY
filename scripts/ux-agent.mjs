#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const [input, out='agent-reports'] = process.argv.slice(2);
if (!input) { console.error('Usage: node scripts/ux-agent.mjs <routes.json> [out]'); process.exit(2); }
const data=JSON.parse(await readFile(resolve(input),'utf8'));
if(!Array.isArray(data.routes)) throw new Error('routes must be an array');
const findings=[];
for(const route of data.routes){
 if(typeof route.path!=='string'||!route.path.startsWith('/')||!Array.isArray(route.actions)) throw new Error('Invalid route');
 if(!route.title) findings.push({path:route.path,code:'missing-title',severity:'medium'});
 if(!route.mobileReviewed) findings.push({path:route.path,code:'mobile-review-needed',severity:'medium'});
 for(const action of route.actions){
  if(typeof action.label!=='string'||!action.label.trim()) findings.push({path:route.path,code:'unlabeled-action',severity:'high'});
  if(action.interactive&&!action.destination&&!action.handler) findings.push({path:route.path,code:'unwired-action',severity:'high',action:action.label??''});
 }
}
await mkdir(out,{recursive:true});
await writeFile(join(out,'ux-report.json'),JSON.stringify({department:'ux',findings,verifiedInBrowser:false,source:'declared route inventory',autoEdit:false,autoDeploy:false},null,2));
console.log('UX inventory findings: '+findings.length);
