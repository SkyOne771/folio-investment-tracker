import {test} from 'node:test';import assert from 'node:assert/strict';
import {fxMatrix,convert,CURRENCIES} from '../src/core.js';
const snapshot={base:'PLN',rates:{PLN:1,USD:.25,EUR:.23,GBP:.2,CHF:.22,CAD:.34,JPY:37.5,AUD:.38,SEK:2.5,DKK:1.7}};
const rates=fxMatrix(snapshot);
test('one FX snapshot covers all currency pairs, including reciprocal conversion',()=>{for(const from of CURRENCIES)for(const to of CURRENCIES){const amount=123.45,converted=convert(amount,from,to,rates),back=convert(converted,to,from,rates);assert.ok(Math.abs(back-amount)<1e-9);assert.equal(rates[from][from],1);}assert.equal(convert(100,'USD','PLN',rates),400);assert.equal(convert(100,'PLN','EUR',rates),23);});
test('missing, zero and nonfinite reference rates are rejected atomically',()=>{for(const rate of [undefined,0,Infinity,-1])assert.throws(()=>fxMatrix({...snapshot,rates:{...snapshot.rates,USD:rate}}));assert.throws(()=>fxMatrix({base:'XYZ',rates:{}}));});
