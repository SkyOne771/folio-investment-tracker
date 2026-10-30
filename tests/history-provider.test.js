import {test} from 'node:test';import assert from 'node:assert/strict';
import {priceHistory,historicalFx} from '../dist/server/index.js';
test('historical price request spans the ledger and handles provider share-class aliases and minor units',async()=>{
 const original=globalThis.fetch,urls=[];globalThis.fetch=async url=>{urls.push(String(url));return Response.json({chart:{result:[{meta:{currency:'GBp'},timestamp:[Date.parse('2025-01-02')/1000],indicators:{quote:[{close:[123]}]},events:{splits:{}}}]}});};
 try{for(const [symbol,provider] of [['FB','META'],['PBRA','PBR-A'],['BRKB','BRK-B']]){const r=await priceHistory(symbol,'2025-01-02');assert.equal(r.symbol,symbol);assert.equal(r.currency,'GBP');assert.equal(r.history[0].close,1.23);const u=new URL(urls.at(-1));assert.ok(u.pathname.endsWith('/'+provider));assert.equal(u.searchParams.get('interval'),'1d');assert.ok(Number(u.searchParams.get('period1'))<Date.parse('2025-01-02')/1000);}}finally{globalThis.fetch=original;}
});
test('historical FX requests include preceding non-trading days and only required currencies',async()=>{
 const original=globalThis.fetch;let url;globalThis.fetch=async input=>{url=new URL(input);return Response.json([{base:'PLN',quote:'USD',date:'2025-01-02',rate:.25}]);};
 try{const r=await historicalFx('PLN','2025-01-02',['USD']);assert.equal(r.rows.length,1);assert.equal(url.searchParams.get('from'),'2024-12-26');assert.equal(url.searchParams.get('base'),'PLN');assert.equal(url.searchParams.get('quotes'),'USD');}finally{globalThis.fetch=original;}
});
test('minute provider requests one-day one-minute bars, skips null bars and scales minor currency units',async()=>{
 const {intradayQuote}=await import('../dist/server/index.js');const original=globalThis.fetch;let url;globalThis.fetch=async input=>{url=new URL(input);return Response.json({chart:{result:[{meta:{currency:'GBp',chartPreviousClose:1200},timestamp:[1000,1060,1120],indicators:{quote:[{close:[1230,null,1240]}]}}]}});};
 try{const r=await intradayQuote('INTRATEST.L');assert.equal(url.searchParams.get('interval'),'1m');assert.equal(url.searchParams.get('range'),'1d');assert.equal(r.currency,'GBP');assert.equal(r.previousClose,12);assert.deepEqual(r.points.map(p=>p.close),[12.3,12.4]);assert.equal(r.points[0].time,1000000);}finally{globalThis.fetch=original;}
});
