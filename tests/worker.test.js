import {test} from 'node:test';import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const get=p=>worker.fetch(new Request('https://test.local'+p));
test('reject arbitrary upstream targets and unsupported currencies',async()=>{assert.equal((await get('/api/quote?symbol=http://evil')).status,400);assert.equal((await get('/api/fx?base=BAD')).status,400);assert.equal((await get('/unknown')).status,404);});
test('historical endpoints validate symbols, currencies and date ranges before provider requests',async()=>{
 for(const path of ['/api/history?symbol=https://evil&start=2025-01-01','/api/history?symbol=AAPL&start=wrong','/api/history?symbol=AAPL&start=1900-01-01','/api/fx/history?base=BAD&start=2025-01-01','/api/fx/history?base=PLN&currencies=BAD&start=2025-01-01'])assert.equal((await get(path)).status,400);
});
