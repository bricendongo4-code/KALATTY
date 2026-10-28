#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const [qaFile,out='agent-reports']=process.argv.slice(2);
if(!qaFile)throw Error('QA report required');
const qa=JSON.parse(await readFile(resolve(qaFile),'utf8'));
const failures=(qa.findings??[]).filter(x=>x&&typeof x==='object');
const handoffs=failures.map((f,index)=>({id:f.id??'QA-'+(index+1),department:'developer',source:'qa',priority:f.priority??'high',job:f.job??null,step:f.step??null,status:'requires-reproduction',automatedFix:false,mergeAllowed:false}));
await mkdir(out,{recursive:true});
await writeFile(join(out,'qa-handoff.json'),JSON.stringify({handoffs,requiresIndependentRegression:true,automatedMerge:false},null,2));
console.log('QA handoffs: '+handoffs.length);
