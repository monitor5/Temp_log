import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const project = process.env.QA_COMPOSE_PROJECT || 'temp-log-test-qa';
const baseURL = process.env.BROWSER_QA_URL || 'http://localhost:8081';
const url = new URL(baseURL);
if (!project.startsWith('temp-log-test-') || url.protocol !== 'http:' || !['localhost','127.0.0.1'].includes(url.hostname) || ['2368','8080'].includes(url.port)) throw new Error('Only disposable QA environments are supported.');
const binding=spawnSync('docker',['compose','-p',project,'port','app','4000'],{encoding:'utf8'});
if (binding.status !== 0 || binding.stdout.trim() !== '127.0.0.1:' + url.port) throw new Error('QA URL does not match the disposable container port.');
await mkdir('artifacts/browser-qa', {recursive:true});
const path='artifacts/qa-private.json';
try {
  const existing=JSON.parse(await readFile(path,'utf8'));
  if (existing.project !== project || existing.baseURL !== baseURL) throw new Error('Existing QA credentials belong to another environment.');
  console.log('Keeping QA credentials for the existing disposable project.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const source=process.env.QA_CREDENTIAL_SOURCE;
  const prior=source ? JSON.parse(await readFile(source,'utf8')) : null;
  if (prior && (typeof prior.username!=='string' || typeof prior.password!=='string')) throw new Error('Invalid QA credential source.');
  const data={username:prior?.username || 'qa-owner',password:prior?.password || randomBytes(32).toString('base64url'),project,baseURL};
  if (!prior) {
    const result=spawnSync('docker',['compose','-p',project,'exec','-T','app','node','dist/cli/admin.js'],{input:JSON.stringify(data),encoding:'utf8'});
    if (result.status!==0) throw new Error('Could not create QA owner; refusing to overwrite an initialized site.');
  }
  await writeFile(path,JSON.stringify(data),{mode:0o600,flag:'wx'});
  console.log('QA credentials prepared; excluded from Git and reports.');
}
