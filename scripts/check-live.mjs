import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const origin=process.env.APP_URL;
async function check(path){const r=origin?await fetch(new URL(path,origin),{signal:AbortSignal.timeout(30000)}):await worker.fetch(new Request('https://test.local'+path),process.env);assert.equal(r.status,200,`${path}: HTTP ${r.status} ${r.status!==200?await r.text():''}`);return r.json();}
assert.equal((await check('/api/health')).status,'ok');
const q=await check('/api/quote?symbol=AAPL');assert.ok(q.price>0);assert.equal(q.currency,'USD');assert.ok(Date.now()-Date.parse(q.asOf)<7*86400000,'Quote older than 7 calendar days');assert.ok(!q.stale,'Provider returned stale cache');assert.ok(q.history.length>100,'Missing price history');assert.ok(q.dividends.length>0,'Missing AAPL dividend events');assert.ok(q.dividends.every(d=>d.amount>0&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)),'Invalid dividend schema');
const fx=await check('/api/fx?base=USD');assert.ok(!fx.stale);for(const c of ['EUR','PLN','GBP'])assert.ok(fx.rates[c]>0);assert.ok(Date.now()-Date.parse(fx.date)<7*86400000,'FX older than 7 days');
console.log(JSON.stringify({status:'healthy',target:origin||'local Worker with live providers',price:q.price,quoteAsOf:q.asOf,dividendEvents:q.dividends.length,fxDate:fx.date},null,2));

// Validate the broker contract without using or storing account credentials.
const specResponse=await fetch('https://docs.trading212.com/_bundle/api.json',{signal:AbortSignal.timeout(20000)});
assert.equal(specResponse.status,200,'Trading 212 API reference unavailable');
const spec=await specResponse.json();
for(const path of ['/api/v0/equity/account/summary','/api/v0/equity/positions','/api/v0/equity/history/dividends'])assert.ok(spec.paths[path]?.get,`Broker endpoint changed: ${path}`);
for(const field of ['instrument','quantity','averagePricePaid','currentPrice'])assert.ok(spec.components.schemas.Position.properties[field],`Broker position field changed: ${field}`);
for(const field of ['reference','amount','currency','paidOn'])assert.ok(spec.components.schemas.HistoryDividendItem.properties[field],`Broker dividend field changed: ${field}`);
console.log('Trading 212 read-only API contract: healthy (no account credentials used)');

// Release checks include the minute feeds used by the European portfolio UI.
const minuteSymbols={'SGLN.L':'GBP','EQQU.L':'USD','VDEM.L':'USD','NATO.L':'USD','GAW.L':'GBP','SSLN.L':'GBP','XSX7.DE':'EUR','SPY5.L':'USD','EUDF.DE':'EUR','DFNX.L':'GBP','DFSV.DE':'EUR','5J50.DE':'EUR','^GSPC':'USD'};
const entries=Object.entries(minuteSymbols);let next=0;
await Promise.all(Array.from({length:3},async()=>{while(next<entries.length){const [symbol,currency]=entries[next++],feed=await check('/api/intraday?symbol='+encodeURIComponent(symbol));assert.equal(feed.currency,currency,`${symbol}: incorrect quote units`);assert.ok(!feed.stale,`${symbol}: stale minute cache`);assert.ok(feed.previousClose>0,`${symbol}: previous close missing`);assert.ok(feed.points.length>1,`${symbol}: minute series missing`);assert.ok(feed.points.every(p=>Number.isFinite(p.time)&&p.close>0),`${symbol}: invalid minute bars`);assert.ok(Date.now()-feed.points.at(-1).time<7*86400000,`${symbol}: minute feed older than 7 days`);}}));
const start=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
const history=await check('/api/history?symbol=AAPL&start='+start);assert.ok(history.history.length>10&&!history.stale,'Historical prices unavailable');
const indexHistory=await check('/api/history?symbol=%5EGSPC&start='+start);assert.equal(indexHistory.currency,'USD');assert.ok(indexHistory.history.length>10&&!indexHistory.stale,'S&P 500 benchmark history unavailable');
const historicalFx=await check('/api/fx/history?base=PLN&start='+start+'&currencies=USD,EUR,SEK');for(const currency of ['USD','EUR','SEK'])assert.ok(historicalFx.rows.some(r=>r.quote===currency&&r.rate>0),'Missing historical FX: '+currency);
console.log(`Release feeds healthy: ${entries.length} minute listings including S&P 500, historical prices and historical FX`);
