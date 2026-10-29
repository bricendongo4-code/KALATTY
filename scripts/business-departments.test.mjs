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

test('control center tracks missing reports and blocks authorization', async () => {
 const dir = await mkdtemp(join(tmpdir(), 'kalatty-center-missing-'));
 const manifest = join(dir, 'manifest.json');
 await writeFile(manifest, JSON.stringify({synthetic:true,reports:[{department:'qa',file:'missing.json'}]}));
 const run = spawnSync(process.execPath,[join(scripts,'ai-control-center.mjs'),manifest,dir],{encoding:'utf8'});
 assert.equal(run.status,1);
 const data = JSON.parse(await readFile(join(dir,'control-center.json'),'utf8'));
 assert.equal(data.summary.errors,1);
 assert.equal(data.departments[0].status,'error');
 assert.equal(data.departments[0].dataMode,'synthetic');
 assert.equal(data.mergeAuthorized,false);
 assert.equal(data.deployAuthorized,false);
});
test('control center resolves report paths relative to manifest', async () => {
 const dir = await mkdtemp(join(tmpdir(), 'kalatty-center-path-'));
 const report = join(dir,'qa.json'),manifest=join(dir,'manifest.json');
 await writeFile(report,JSON.stringify({department:'qa',findings:[{code:'CI'}]}));
 await writeFile(manifest,JSON.stringify({reports:[{department:'qa',file:'qa.json'}]}));
 const run = spawnSync(process.execPath,[join(scripts,'ai-control-center.mjs'),manifest,dir],{encoding:'utf8',cwd:tmpdir()});
 assert.equal(run.status,0,run.stderr);
 const data=JSON.parse(await readFile(join(dir,'control-center.json'),'utf8'));
 assert.equal(data.summary.reviewRequired,1);
 assert.equal(data.departments[0].status,'reported');
});
