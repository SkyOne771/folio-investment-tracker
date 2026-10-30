import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconstructPerformance,historicalClose,historyWindow} from '../src/historical-performance.js';
const trade=(type,date,quantity,price,extra={})=>({type,date,quantity,price,symbol:'TEST',currency:'USD',fees:0,...extra});
const series={TEST:{currency:'USD',history:[{date:'2025-01-02',close:10},{date:'2025-01-03',close:12},{date:'2025-01-06',close:15}]}};
test('replays historical quantities, closed trades and net dividends from the first trade',()=>{
 const tx=[trade('buy','2025-01-02',10,10),trade('sell','2025-01-06',10,15),{type:'dividend',symbol:'TEST',currency:'USD',date:'2025-01-03',amount:5,tax:1,fees:0}];
 const result=reconstructPerformance(tx,series,[],'USD','2025-01-07');
 assert.equal(result.start,'2025-01-02');assert.deepEqual(result.points.map(p=>p.gain),[0,24,24,24,54,54]);assert.equal(result.points.at(-1).value,0);assert.deepEqual(result.missing,[]);
});
test('uses historical FX, never today’s rate, and carries preceding weekend rates',()=>{
 const tx=[trade('buy','2025-01-02',10,10)];const fx=[{date:'2025-01-02',base:'PLN',quote:'USD',rate:.25},{date:'2025-01-03',base:'PLN',quote:'USD',rate:.2}];
 const r=reconstructPerformance(tx,series,fx,'PLN','2025-01-04');assert.deepEqual(r.points.map(p=>p.gain),[0,100,100]);
});
test('cash account and market quote currencies are independent, accounts do not merge cost bases',()=>{
 const tx=[trade('buy','2025-01-02',10,40,{accountId:'one',currency:'PLN',marketCurrency:'USD'}),trade('buy','2025-01-02',2,10,{accountId:'two'}),trade('sell','2025-01-03',1,13,{accountId:'two'})];
 const fx=[{date:'2025-01-02',base:'PLN',quote:'USD',rate:.25}];const r=reconstructPerformance(tx,series,fx,'PLN','2025-01-03');assert.equal(r.points.at(-1).gain,100);
 const separate=reconstructPerformance(tx.filter(t=>t.accountId==='two'),series,[],'USD','2025-01-03');assert.equal(separate.points.at(-1).gain,5);
});
test('missing prices produce gaps only while shares are held, without future price lookahead',()=>{
 const tx=[trade('buy','2025-01-01',1,10),trade('sell','2025-01-03',1,12)];const r=reconstructPerformance(tx,{},[],'USD','2025-01-04');assert.deepEqual(r.points.map(p=>p.gain),[null,null,2,2]);assert.ok(r.missing.includes('TEST'));
 assert.equal(historicalClose(series.TEST,'2025-01-01'),null);assert.equal(historicalClose(series.TEST,'2025-01-20'),null);
});
test('missing historical FX is a gap and cannot be replaced with current reference FX',()=>{const r=reconstructPerformance([trade('buy','2025-01-02',1,10)],series,[],'PLN','2025-01-03');assert.ok(r.points.every(p=>p.gain===null));});
test('split-adjusted closes are restored to historical units before and after ledger splits',()=>{
 const s={TEST:{currency:'USD',history:[{date:'2025-01-02',close:5},{date:'2025-01-03',close:6}],splits:[{day:'2025-01-03',numerator:2,denominator:1}]}};
 const tx=[trade('buy','2025-01-02',10,10),trade('split','2025-01-03',2,0)];const r=reconstructPerformance(tx,s,[],'USD','2025-01-03');assert.deepEqual(r.points.map(p=>p.gain),[0,20]);
});
test('signed dividend corrections affect only their posting dates and do not create holdings',()=>{const tx=[{type:'income-adjustment',date:'2025-01-02',symbol:'TEST',currency:'USD',amount:-2,tax:0,fees:0},{type:'income-adjustment',date:'2025-01-03',symbol:'TEST',currency:'USD',amount:1,tax:0,fees:0}];assert.deepEqual(reconstructPerformance(tx,{},[],'USD','2025-01-03').points.map(p=>p.gain),[-2,-1]);});
test('period controls filter reconstructed dates and empty ledgers remain empty',()=>{assert.deepEqual(reconstructPerformance([],{},[],'USD'),{points:[],missing:[]});assert.deepEqual(historyWindow([{date:'2024-01-01'},{date:'2025-01-02'}],30,new Date('2025-01-03')).map(p=>p.date),['2025-01-02']);});
test('value and dividend charts remain available independently of missing market prices',()=>{
 const tx=[trade('buy','2025-01-02',1,10),{type:'dividend',symbol:'TEST',currency:'USD',date:'2025-01-03',amount:5,tax:1,fees:0}];
 const result=reconstructPerformance(tx,{},[],'USD','2025-01-03');assert.equal(result.points.at(-1).gain,null);assert.equal(result.points.at(-1).value,null);assert.equal(result.points.at(-1).paid,4);assert.equal(result.points[0].paid,0);
});
test('each chart metric selects its own series, preserving zeroes and gaps',async()=>{
 const {metricHistory,performanceMetric}=await import('../src/historical-performance.js');const points=[{date:'2025-01-02',gain:-5,value:100,paid:0},{date:'2025-01-03',gain:null,value:110,paid:4}];
 assert.deepEqual(metricHistory(points,'gain').map(p=>p.chartValue),[-5,null]);assert.deepEqual(metricHistory(points,'value').map(p=>p.chartValue),[100,110]);assert.deepEqual(metricHistory(points,'paid').map(p=>p.chartValue),[0,4]);assert.equal(performanceMetric('bad'),'gain');
});
