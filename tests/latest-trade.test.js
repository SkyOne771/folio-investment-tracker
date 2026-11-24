import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retainNewerTrade,withLatestTrade} from '../src/latest-trade.js';

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

test('a delayed regular quote cannot roll back a newer extended-hours price',()=>{
 const regular={currency:'USD',price:100,asOf:'2026-11-23T21:00Z',dividends:[{amount:1}]};
 const current={currency:'USD',price:96,asOf:'2026-11-24T10:14Z',marketSession:'pre',source:'Yahoo Finance minute trade'};
 const result=retainNewerTrade(regular,current);
 assert.equal(result.price,96);
 assert.equal(result.marketSession,'pre');
 assert.equal(result.dividends,regular.dividends);
 assert.equal(retainNewerTrade({...regular,asOf:'2026-11-24T15:00Z'},current).price,100);
 assert.equal(retainNewerTrade(regular,{...current,source:'Trading 212 position snapshot'}),regular);
});
