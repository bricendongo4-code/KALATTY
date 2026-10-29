#!/usr/bin/env node
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const [manifest,out='agent-reports']=process.argv.slice(2);
if(!manifest) throw Error('Usage: ai-control-center.mjs <manifest.json> [out]');
const data=JSON.parse(await readFile(resolve(manifest),'utf8'));
if(!Array.isArray(data.reports)) throw Error('reports must be an array');
const allowed=new Set(['security','qa','ux','product','marketing','sales','support','finance','analytics','crm','developer']);
const departments=[];
for(const entry of data.reports){
 if(!entry||!allowed.has(entry.department)||typeof entry.file!=='string') throw Error('Invalid report entry');
 const report=JSON.parse(await readFile(resolve(entry.file),'utf8'));
 if(report.department&&report.department!==entry.department) throw Error('Report department mismatch');
 const findings=Array.isArray(report.findings)?report.findings.length:0;
 const queue=Array.isArray(report.queue)?report.queue.length:0;
 departments.push({department:entry.department,findings,queue,source:entry.file,reviewRequired:findings>0||queue>0});
}
await mkdir(out,{recursive:true});
await writeFile(join(resolve(out),'control-center.json'),JSON.stringify({version:1,departments,allDepartmentsVerified:false,mergeAuthorized:false,deployAuthorized:false,liveMonitoringEnabled:false},null,2));
console.log('Control center loaded '+departments.length+' reports');
