import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeBrokerPayments} from '../src/broker-payments.js';
test('reconnection after backup restore isolates API payments by account and environment without losing other records',()=>{
 const payment=id=>({id,source:'trading212',type:'dividend',date:'2026-01-01',symbol:'AAPL',currency:'USD',amount:2,fees:0,tax:0});
 const manual={id:'manual',type:'dividend',symbol:'AAPL',currency:'USD',amount:5},old=payment('t212:live:123:old'),incoming=payment('t212:live:123:new'),records=[manual,old,payment('t212:live:999:other'),payment('t212:demo:123:demo')],before=JSON.stringify(records),broker={accountId:'123',environment:'live'};
 const result=mergeBrokerPayments(records,[old,incoming],broker);assert.deepEqual(result.map(t=>t.id),['manual',old.id,incoming.id]);assert.equal(JSON.stringify(records),before);assert.throws(()=>mergeBrokerPayments(records,[payment('t212:live:999:bad')],broker),/another broker account/);
});
