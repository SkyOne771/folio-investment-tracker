import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveHistoryListing} from '../src/history-resolution.js';
test('ISIN resolution requires matching currency, skips failed listings and never invents missing history',async()=>{
 const search=async id=>{assert.equal(id,'IE0000000001');return {quotes:[{symbol:'WRONG',quoteType:'ETF'},{symbol:'GONE',quoteType:'ETF'},{symbol:'MATCH.L',quoteType:'ETF'}]};};
 const history=async symbol=>{if(symbol==='GONE')throw Error('delisted');return {currency:symbol==='WRONG'?'EUR':'USD',history:[{date:'2025-01-01',close:10}]};};
 const result=await resolveHistoryListing('IE0000000001','USD',search,history);assert.equal(result.resolvedSymbol,'MATCH.L');assert.equal(result.currency,'USD');
 await assert.rejects(resolveHistoryListing('IE0000000001','GBP',search,history),/No historical listing verified/);
 await assert.rejects(resolveHistoryListing('https://evil','USD',()=>assert.fail('network'),history),/Invalid/);
 await assert.rejects(resolveHistoryListing('IE0000000001','USD',async()=>({quotes:[]}),history),/No historical listing verified/);
});
test('alternate-currency listings use dated FX without lookahead or stale-rate filling',async()=>{
 const result=await resolveHistoryListing('IE0000000001','USD',async()=>({quotes:[{symbol:'SAME.DE',quoteType:'ETF'}]}),async()=>({currency:'EUR',history:[{date:'2025-01-01',close:10},{date:'2025-01-02',close:10},{date:'2025-01-20',close:10}]}),async()=>[{base:'USD',quote:'EUR',date:'2025-01-02',rate:.8}]);
 assert.deepEqual(result.history,[{date:'2025-01-02',close:12.5}]);assert.equal(result.currency,'USD');assert.equal(result.resolvedCurrency,'EUR');
});
