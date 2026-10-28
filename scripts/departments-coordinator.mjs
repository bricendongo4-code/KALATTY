#!/usr/bin/env node
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const [qaFile,securityFile,uxFile,productFile,out='agent-reports']=process.argv.slice(2);
if(!qaFile||!securityFile||!uxFile||!productFile) throw Error('Expected QA, security, UX, product report paths');
const load=async file=>JSON.parse(await readFile(resolve(file),'utf8'));
const [qa,security,ux,product]=await Promise.all([load(qaFile),load(securityFile),load(uxFile),load(productFile)]);
const queue=[];
for(const f of qa.findings??[]) queue.push({department:'qa',priority:f.priority??'high',reference:f.id??f.step??'CI failure',verified:false});
for(const f of security.findings??[]) queue.push({department:'security',priority:f.severity??'high',reference:f.rule??'security review',verified:false});
for(const f of ux.findings??[]) queue.push({department:'ux',priority:f.severity??'medium',reference:f.code??'UX review',verified:false});
for(const item of product.items??[]) if(item.status!=='done') queue.push({department:'product',priority:item.priority,reference:item.id,verified:false,actionable:item.actionable});
const rank={critical:0,high:1,medium:2,low:3};
queue.sort((a,b)=>(rank[a.priority]??4)-(rank[b.priority]??4)||a.department.localeCompare(b.department));
await mkdir(out,{recursive:true});
await writeFile(join(out,'coordination-report.json'),JSON.stringify({version:1,queue,approvalRequiredForMerge:true,approvalRequiredForDeploy:true,verifiedInStaging:false},null,2));
console.log('Coordination items: '+queue.length);
