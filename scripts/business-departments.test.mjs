import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const scripts=new URL('.',import.meta.url).pathname;
test('six departments produce only aggregate read-only reports',async()=>{
 for(const dept of ['marketing','sales','support','finance','analytics','crm']){
  const dir=await mkdtemp(join(tmpdir(),'kalatty-business-'));
  const input=join(dir,'records.json');
  await writeFile(input,JSON.stringify({records:[{id:'item1',status:'planned',type:'income',amount:12,owner:'team',event:'view'}]}));
  const result=spawnSync(process.execPath,[join(scripts,'business-department-agent.mjs'),dept,input,dir],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(await readFile(join(dir,dept+'-report.json'),'utf8'));
  assert.equal(report.externalActionsPerformed,false);
  assert.equal(report.containsNoRawRecords,true);
  assert.equal(report.approvalRequiredForMerge,true);
 }
});
test('control center aggregates without authorizing production',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kalatty-center-'));
 const report=join(dir,'marketing.json'),manifest=join(dir,'manifest.json');
 await writeFile(report,JSON.stringify({department:'marketing',summary:{campaigns:1}}));
 await writeFile(manifest,JSON.stringify({reports:[{department:'marketing',file:report}]}));
 const result=spawnSync(process.execPath,[join(scripts,'ai-control-center.mjs'),manifest,dir],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const data=JSON.parse(await readFile(join(dir,'control-center.json'),'utf8'));
 assert.equal(data.departments.length,1);
 assert.equal(data.deployAuthorized,false);
});
