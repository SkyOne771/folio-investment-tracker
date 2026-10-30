import {test} from 'node:test';import assert from 'node:assert/strict';import {valuationStatus} from '../src/valuation-status.js';
const rows=[{symbol:'PDX.ST',currency:'PLN',marketCurrency:'SEK'},{symbol:'ETFBDIVPL.WA',currency:'PLN',marketCurrency:'PLN'},{symbol:'WEBQ.DE',currency:'PLN',marketCurrency:'USD'},{symbol:'ETFPZUW20M40.WA',currency:'PLN',marketCurrency:'PLN'},{symbol:'VGLA.DE',currency:'PLN',marketCurrency:'EUR'}];
const quotes=Object.fromEntries(rows.map(h=>[h.symbol,{currency:h.marketCurrency,price:10}]));const fx={SEK:{PLN:.4},USD:{PLN:4},EUR:{PLN:4.3}};
test('pending prices are loading, not failed valuations',()=>{assert.deepEqual(valuationStatus(rows,{},'PLN',{},true),{pending:rows.map(h=>h.symbol),issues:[]});});
test('all five reported listings value with their actual quote and separate PLN cash currencies',()=>{assert.deepEqual(valuationStatus(rows,quotes,'PLN',fx),{pending:[],issues:[]});});
test('completed failed requests identify unavailable prices',()=>{assert.match(valuationStatus(rows,{},'PLN',{}).issues[0],/PDX.ST: price unavailable/);});
test('currency mismatches report both currencies rather than silently changing the cash ledger',()=>{const r=valuationStatus(rows,{...quotes,'WEBQ.DE':{currency:'EUR',price:1}},'PLN',fx);assert.deepEqual(r.issues,['WEBQ.DE: quote is EUR, instrument is mapped to USD']);});
test('pending FX is distinguished from a completed missing exchange rate',()=>{assert.equal(valuationStatus(rows,quotes,'PLN',{},true).pending.length,3);assert.equal(valuationStatus(rows,quotes,'PLN',{}).issues.length,3);});
