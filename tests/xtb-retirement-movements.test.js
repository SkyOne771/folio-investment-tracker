import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseXtbSheets,mergeXtbTransactions} from '../src/xtb.js';
import {summary} from '../src/core.js';
const headers=['ID','Type','Time','Comment','Symbol','Amount'];
const base=[[1,'Stock purchase','2026-01-01','OPEN BUY 2 @ 100','TEST.PL',-200],[2,'Dividend','2026-02-01','','TEST.PL',20],[3,'Withholding tax','2026-02-01','','TEST.PL',-3]];
const parse=rows=>parseXtbSheets([{sheet:'Cash Operations',data:[headers,...rows]}],{accountType:'regular',accountRef:'fixture-account',currency:'PLN'});
for(const operation of ['IKZE return full','IKZE return partial','IKZE tax','IKE return full','IKE return partial','IKE tax'])test(`${operation} is excluded without changing investment or dividend totals`,()=>{const expected=parse(base),actual=parse([...base,[18,operation,'2026-03-01','','',-5000]]);assert.deepEqual(actual.errors,[]);assert.deepEqual(actual.transactions,expected.transactions);assert.equal(actual.ignored.length,1);assert.equal(actual.ignored[0].type,operation);assert.match(actual.ignored[0].reason,/withdrawal or transfer tax/);assert.equal(mergeXtbTransactions([],actual).added,2);const totals=summary(actual.transactions,{'TEST.WA':{currency:'PLN',price:120}},'PLN',{});assert.equal(totals.value,240);assert.equal(totals.paid,17);assert.equal(totals.totalGain,57);});
test('other unknown IKZE operation types still require review',()=>{const p=parse([...base,[18,'IKZE unsupported adjustment','2026-03-01','','',-5000]]);assert.ok(p.errors.some(e=>e.includes('unsupported operation')));});
