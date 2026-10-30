import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),issues=[];
for(const path of paths){
 if(/\.(?:xlsx?|csv|pdf|jsonl|pem|key)$/i.test(path)||/(?:^|\/)(?:folio-backup-[^/]+\.json|\.env(?:\.[^/]+)?|backups|statements|imports|private-data)(?:\/|$)/i.test(path)&&!path.endsWith('.env.example'))issues.push(`${path}: private export or environment file must not be tracked`);
 const text=readFileSync(path,'utf8');
 if(/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))issues.push(`${path}: potential credential material`);
 if(path==='.openai/hosting.json'&&JSON.parse(text).project_id)issues.push(`${path}: use a sanitized manifest without a private project identity`);
 if(path==='package-lock.json')continue;
 for(const match of text.matchAll(/(?:api[_-]?(?:key|secret)|token|password|BROKER_VAULT_KEY)\s*[=:]\s*['"]([A-Za-z0-9+/=_-]{16,})['"]/gi))if(!/^(?:fixture|e2e|example|dummy|test|your|replace|placeholder)/i.test(match[1]))issues.push(`${path}: review a credential-like literal (value redacted)`);
}
if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}else console.log(`Public-source guard passed: ${paths.length} tracked files; no prohibited exports, credential patterns or private deployment identity.`);
