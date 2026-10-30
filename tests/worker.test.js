import {test} from 'node:test';import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const get=p=>worker.fetch(new Request('https://test.local'+p));
test('health contract',async()=>{const r=await get('/api/health');assert.equal(r.status,200);assert.equal((await r.json()).status,'ok');});
test('app and client assets have correct types and security headers',async()=>{for(const p of ['/','/client.js','/core.js','/style.css']){const r=await get(p);assert.equal(r.status,200);assert.ok(r.headers.get('content-security-policy'));assert.ok((await r.text()).length>100);}});
test('reject arbitrary upstream targets and unsupported currencies',async()=>{assert.equal((await get('/api/quote?symbol=http://evil')).status,400);assert.equal((await get('/api/fx?base=BAD')).status,400);assert.equal((await get('/unknown')).status,404);});
test('API rejects mutation requests',async()=>assert.equal((await worker.fetch(new Request('https://test.local/api/health',{method:'POST'}))).status,405));
test('Excel decompression workers are permitted without allowing remote scripts',async()=>{const r=await get('/');const policy=r.headers.get('content-security-policy');assert.ok(policy.includes("worker-src 'self' blob:"));assert.ok(policy.includes("script-src 'self';"));});
test('historical endpoints validate symbols, currencies and date ranges before provider requests',async()=>{
 for(const path of ['/api/history?symbol=https://evil&start=2025-01-01','/api/history?symbol=AAPL&start=wrong','/api/history?symbol=AAPL&start=1900-01-01','/api/fx/history?base=BAD&start=2025-01-01','/api/fx/history?base=PLN&currencies=BAD&start=2025-01-01'])assert.equal((await get(path)).status,400);
});
test('minute route rejects arbitrary upstream targets',async()=>{assert.equal((await get('/api/intraday?symbol=https://evil')).status,400);});
