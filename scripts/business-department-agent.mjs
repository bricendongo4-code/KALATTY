#!/usr/bin/env node
/**
 * Offline, read-only department processors. No customer messaging, billing,
 * outbound CRM writes, or autonomous deployments.
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const [department,input,out='agent-reports']=process.argv.slice(2);
const allowed=['marketing','sales','support','finance','analytics','crm'];
if(!allowed.includes(department)||!input) throw Error('Usage: department-agent.mjs <'+allowed.join('|')+'> <input.json> [output]');
const data=JSON.parse(await readFile(resolve(input),'utf8'));
if(!Array.isArray(data.records)) throw Error('Expected records array');
if(data.records.length>10000) throw Error('Record limit exceeded');
const records=data.records.map((record,index)=>{
 if(!record||typeof record!=='object'||Array.isArray(record)||typeof record.id!=='string'||!record.id.trim()) throw Error('Invalid record '+index);
 return record;
});
const sum=(items,key)=>items.reduce((total,item)=>total+(typeof item[key]==='number'&&Number.isFinite(item[key])?item[key]:0),0);
let summary;
switch(department){
 case 'marketing': summary={campaigns:records.length,planned:records.filter(x=>x.status==='planned').length,needsReview:records.filter(x=>!x.audience||!x.goal).length};break;
 case 'sales': summary={opportunities:records.length,open:records.filter(x=>x.stage!=='won'&&x.stage!=='lost').length,estimatedPipeline:sum(records.filter(x=>x.stage!=='lost'),'amount')};break;
 case 'support': summary={tickets:records.length,open:records.filter(x=>x.status!=='resolved').length,urgent:records.filter(x=>x.priority==='critical'||x.priority==='high').length};break;
 case 'finance': summary={entries:records.length,income:sum(records.filter(x=>x.type==='income'),'amount'),expenses:sum(records.filter(x=>x.type==='expense'),'amount'),currency:data.currency??'EUR',reconciled:false};break;
 case 'analytics': summary={events:records.length,eventTypes:[...new Set(records.map(x=>x.event).filter(x=>typeof x==='string'))].sort(),uniqueAnonymousActors:new Set(records.map(x=>x.actorHash).filter(x=>typeof x==='string')).size};break;
 case 'crm': summary={contacts:records.length,followUpDue:records.filter(x=>x.followUpStatus==='due').length,unassigned:records.filter(x=>!x.owner).length};break;
}
await mkdir(out,{recursive:true});
const report={department,summary,source:'provided structured input',verifiedAgainstProduction:false,containsNoRawRecords:true,externalActionsPerformed:false,approvalRequiredForOutboundActions:true,approvalRequiredForMerge:true,approvalRequiredForDeploy:true};
await writeFile(join(resolve(out),department+'-report.json'),JSON.stringify(report,null,2));
console.log(department+' report ready');
