import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const scripts=new URL('.',import.meta.url).pathname;
test('product agent respects dependencies',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kalatty-product-'));
 const input=join(dir,'input.json');
 await writeFile(input,JSON.stringify({items:[
 {id:'a',title:'Security',priority:'critical',status:'in-progress',dependencies:[]},
 {id:'b',title:'Launch',priority:'high',status:'ready',dependencies:['a']}
 ]}));
 const r=spawnSync(process.execPath,[join(scripts,'product-agent.mjs'),input,dir],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(await readFile(join(dir,'product-report.json'),'utf8'));
 assert.equal(report.items[1].actionable,false);
 assert.equal(report.autoDeploy,false);
});
test('ux agent flags unconnected actions without claiming browser verification',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kalatty-ux-'));
 const input=join(dir,'input.json');
 await writeFile(input,JSON.stringify({routes:[{path:'/dashboard',title:'Dashboard',mobileReviewed:false,actions:[{label:'Save',interactive:true}]}]}));
 const r=spawnSync(process.execPath,[join(scripts,'ux-agent.mjs'),input,dir],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(await readFile(join(dir,'ux-report.json'),'utf8'));
 assert.ok(report.findings.some(x=>x.code==='unwired-action'));
 assert.equal(report.verifiedInBrowser,false);
});
