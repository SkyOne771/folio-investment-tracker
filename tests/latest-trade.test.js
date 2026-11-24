import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withLatestTrade} from '../src/latest-trade.js';

test('a newer pre-market selloff replaces yesterday’s close without losing quote history',()=>{
 const now=Date.parse('2026-11-24T10:15Z');
 const quote={price:100,currency:'USD',asOf:'2026-11-23T21:00Z',history:[{close:100}]};
 const feed={currency:'USD',points:[{close:96,time:now-60000,marketSession:'pre'}]};
 const current=withLatestTrade(quote,feed,now);
 assert.equal(current.price,96);
 assert.equal(current.marketSession,'pre');
 assert.equal(current.history,quote.history);
 assert.equal(withLatestTrade(current,{...feed,points:[{close:93,time:now-120000}]},now),current);
 assert.equal(withLatestTrade(quote,{...feed,currency:'GBP'},now),quote);
 assert.equal(withLatestTrade(quote,{...feed,stale:true},now),quote);
 assert.equal(withLatestTrade(quote,{...feed,points:[],previousClose:95},now),quote);
});
