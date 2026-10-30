import {test} from 'node:test';import assert from 'node:assert/strict';
import {sortHoldings} from '../src/holdings-sort.js';
const rows=[{symbol:'A',name:'Zulu',quantity:2,value:10,gain:-3,quote:{price:5}},{symbol:'Z',name:'alpha',quantity:10,value:100,gain:20,quote:{price:10}},{symbol:'M',name:'Middle',quantity:1,value:null,gain:null}];
const ids=items=>items.map(h=>h.symbol);
test('asset sorts use company names, not ticker order',()=>{assert.deepEqual(ids(sortHoldings(rows,'asset','asc',{name:h=>h.name})),['Z','M','A']);assert.deepEqual(ids(sortHoldings(rows,'asset','desc',{name:h=>h.name})),['A','M','Z']);});
test('numeric sort handles negative returns and missing values last in both directions',()=>{assert.deepEqual(ids(sortHoldings(rows,'gain','asc')),['A','Z','M']);assert.deepEqual(ids(sortHoldings(rows,'gain','desc')),['Z','A','M']);assert.deepEqual(ids(sortHoldings(rows,'quantity','desc')),['Z','A','M']);assert.deepEqual(ids(sortHoldings(rows,'value','asc')),['A','Z','M']);});
test('price sorts compare converted display-currency prices',()=>{const price=h=>h.symbol==='A'?500:h.quote?.price;assert.deepEqual(ids(sortHoldings(rows,'price','desc',{price})),['A','Z','M']);});
test('weights follow the full portfolio value and sort without mutating input',()=>{assert.deepEqual(ids(sortHoldings(rows,'weight','desc',{totalValue:110})),['Z','A','M']);assert.deepEqual(ids(rows),['A','Z','M']);assert.deepEqual(ids(sortHoldings(rows,'weight','desc',{totalValue:0})),ids(rows));});
test('equal values are stable and an unknown sort leaves broker order unchanged',()=>{assert.deepEqual(ids(sortHoldings(rows,'unknown','asc')),ids(rows));assert.deepEqual(ids(sortHoldings(rows.map(h=>({...h,value:1})),'value','asc')),ids(rows));});
