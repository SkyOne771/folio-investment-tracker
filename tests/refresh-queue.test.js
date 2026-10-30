import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRefreshQueue} from '../src/refresh-queue.js';

test('broker snapshot arriving during refresh gets a second pass with new holdings',async()=>{
 let release;const blocked=new Promise(resolve=>release=resolve);
 let holdings=['OLD'],passes=[];let concurrent=0,maxConcurrent=0;
 const refresh=createRefreshQueue(async()=>{concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);passes.push([...holdings]);if(passes.length===1)await blocked;concurrent--;});
 const initial=refresh();holdings=['WPC','WELL','SGLNL-EQ'];
 const brokerSync=refresh();refresh();release();await Promise.all([initial,brokerSync]);
 assert.deepEqual(passes,[['OLD'],['WPC','WELL','SGLNL-EQ']]);assert.equal(maxConcurrent,1);
 await refresh();assert.equal(passes.length,3);
});

test('a failed refresh releases the queue so a later check can recover',async()=>{
 let attempts=0;const refresh=createRefreshQueue(async()=>{if(++attempts===1)throw Error('unavailable');});
 await assert.rejects(refresh(),/unavailable/);await refresh();assert.equal(attempts,2);
});
