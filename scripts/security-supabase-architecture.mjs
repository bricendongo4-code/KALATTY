#!/usr/bin/env node
/**
 * Narrow, read-only architecture guard for the Supabase authentication client.
 * Prevents silent reintroduction of privileged auth-client fallback once fixed.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const [file = 'backend/src/supabase/supabase.service.ts', output = 'security-reports'] = process.argv.slice(2);
const source = await readFile(resolve(file), 'utf8');
const checks = [
  { id: 'auth-client-service-role-fallback', present: /createClient\(url,\s*publicKey\s*\?\?\s*serviceRoleKey/.test(source),
    severity: 'high', guidance: 'Require a public/publishable key for authClient; never silently fall back to the service-role key.' },
  { id: 'privileged-backend-client', present: /createClient\(url,\s*serviceRoleKey\s*\?\?\s*publicKey/.test(source),
    severity: 'high', guidance: 'Review every privileged query for verified user, institution membership, and role enforcement.' },
];
const findings = checks.filter(c=>c.present).map(({id,severity,guidance})=>({id,severity,guidance,status:'review-required'}));
await mkdir(output,{recursive:true});
await writeFile(join(resolve(output),'supabase-architecture.json'),JSON.stringify({
  version:1,file,status:findings.length?'review-required':'no-pattern-match',
  findings,confirmedVulnerabilities:0,autoFix:false,mergeAllowed:false,
  note:'Source-pattern review only. A matching fallback is a configuration risk, not proof of exploitation.'
},null,2));
console.log(JSON.stringify({findings:findings.length,ids:findings.map(x=>x.id)}));
