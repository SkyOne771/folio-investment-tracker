import {test} from 'node:test';import assert from 'node:assert/strict';
import {portfolioPerformance} from '../src/performance.js';

const fx={USD:{PLN:4}};
const holdings=[{symbol:'A',currency:'USD',quantity:2,cost:100}];
const quotes={A:{currency:'USD',price:60}};
const dividend={type:'dividend',symbol:'A',currency:'USD',amount:5,tax:1,fees:0,date:'2026-01-01'};
test('combined portfolio gain includes realised, unrealised and net recorded dividends',()=>{const p=portfolioPerformance([dividend],quotes,'PLN',fx,holdings);assert.equal(p.value,480);assert.equal(p.unrealized,80);assert.equal(p.paid,16);assert.equal(p.gain,96);assert.equal(p.complete,true);});
test('broker account metrics include closed trades and do not double count snapshot gains',()=>{const broker={currency:'USD',investments:{currentValue:120,totalCost:100,realizedProfitLoss:30,unrealizedProfitLoss:18}};const p=portfolioPerformance([dividend],quotes,'PLN',fx,holdings,broker);assert.equal(p.gain,208);assert.equal(p.realized,120);assert.equal(p.unrealized,72);assert.equal(p.paid,16);assert.equal(p.brokerReported,true);});
test('missing FX or prices cannot be recorded as complete performance',()=>{assert.equal(portfolioPerformance([],quotes,'PLN',{},holdings).complete,false);assert.equal(portfolioPerformance([],{},'USD',{},holdings).complete,false);});
