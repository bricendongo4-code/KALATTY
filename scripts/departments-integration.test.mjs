import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const scripts=new URL('.',import.meta.url).pathname;
test('coordinator prioritizes security and preserves human release gates',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kalatty-coord-'));
 const files=['qa','security','ux','product'].map(x=>join(dir,x+'.json'));
 for(const [i,value] of [{findings:[{id:'ci',priority:'high'}]},{findings:[{rule:'tenant',severity:'critical'}]},{findings:[{code:'mobile',severity:'medium'}]},{items:[{id:'launch',priority:'high',status:'blocked',actionable:false}]}].entries()) await writeFile(files[i],JSON.stringify(value));
 const r=spawnSync(process.execPath,[join(scripts,'departments-coordinator.mjs'),...files,dir],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(await readFile(join(dir,'coordination-report.json'),'utf8'));
 assert.equal(report.queue[0].department,'security');
 assert.equal(report.approvalRequiredForMerge,true);
});
test('QA handoff does not authorize changes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kalatty-handoff-')),input=join(dir,'qa.json');
 await writeFile(input,JSON.stringify({findings:[{id:'f1',priority:'high',job:'backend'}]}));
 const r=spawnSync(process.execPath,[join(scripts,'qa-handoff.mjs'),input,dir],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(await readFile(join(dir,'qa-handoff.json'),'utf8'));
 assert.equal(report.handoffs.length,1);
 assert.equal(report.handoffs[0].automatedFix,false);
});
