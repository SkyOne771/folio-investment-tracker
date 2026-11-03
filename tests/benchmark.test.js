import {test} from 'node:test';import assert from 'node:assert/strict';
import {dailyBenchmark,rebasedBenchmark} from '../src/benchmark.js';
const dates=['2026-01-02','2026-01-03','2026-01-05'];const series={currency:'USD',history:[{date:dates[0],close:100},{date:dates[2],close:110}]};
test('daily index uses historical reference FX and preceding closes without future lookahead',()=>{const r=dailyBenchmark(['2026-01-01',...dates],series,[{base:'PLN',quote:'USD',date:'2026-01-02',rate:.25},{base:'PLN',quote:'USD',date:'2026-01-05',rate:.2}],'PLN');assert.deepEqual(r.map(p=>p.level),[null,400,400,550]);});
const portfolio=dates.map((date,i)=>({date,value:[1000,1200,900][i],gain:[-50,10,30][i],paid:i}));
test('value benchmark is rebased to the same initial market value rather than raw index units',()=>{const r=rebasedBenchmark(portfolio,dailyBenchmark(dates,series,[],'USD'),'value');assert.deepEqual(r.points.map(p=>p.benchmark),[1000,1000,1100]);assert.equal(r.anchor,dates[0]);assert.ok(Math.abs(r.points.at(-1).benchmarkReturn-10)<1e-10);});
