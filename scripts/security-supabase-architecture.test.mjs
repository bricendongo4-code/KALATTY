import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./security-supabase-architecture.mjs',import.meta.url).pathname;
test('identifies privileged fallback without modifying source',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kalatty-architecture-'));
 const path=join(dir,'service.ts');
 const source='this.authClient = createClient(url, publicKey ?? serviceRoleKey!, {});';
 await writeFile(path,source);
 const run=spawnSync(process.execPath,[script,path,dir],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(await readFile(join(dir,'supabase-architecture.json'),'utf8'));
 assert.equal(report.findings[0].id,'auth-client-service-role-fallback');
 assert.equal(report.confirmedVulnerabilities,0);
 assert.equal(await readFile(path,'utf8'),source);
});
test('does not flag public-only authentication client',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kalatty-architecture-'));
 const path=join(dir,'service.ts');
 await writeFile(path,'this.authClient = createClient(url, publicKey!, {});');
 const run=spawnSync(process.execPath,[script,path,dir],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(await readFile(join(dir,'supabase-architecture.json'),'utf8'));
 assert.equal(report.findings.length,0);
});
