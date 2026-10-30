import {parseXtbSheets,mergeXtbTransactions} from './xtb.js';
import {xtbAccountDetails} from './core.js';

export function xtbDestinationErrors(entry){
 const m=entry.loaded.metadata||{},o=entry.options,errors=[];
 if(m.accountType&&m.accountType!==o.accountType)errors.push('Account type differs from the detected statement account.');
 if(m.accountRef&&m.accountRef!==o.accountRef)errors.push('Account number differs from the detected statement account.');
 if(m.currency&&m.currency!==o.currency)errors.push('Cash currency differs from the detected statement account.');
 return errors;
}
export function prepareXtbBatch(existing,entries){
 const files=[];for(let index=0;index<entries.length;index++){
  const entry=entries[index];if(entry.status==='imported')continue;
  try{const destinationErrors=xtbDestinationErrors(entry);if(destinationErrors.length)throw Error(destinationErrors.join(' '));
   const preview=parseXtbSheets(entry.loaded.sheets,entry.options);files.push({index,accountId:preview.accountId,preview,errors:[...preview.errors]});
  }catch(e){files.push({index,preview:null,errors:[e.message||'Could not preview this statement.']});}
 }
 const accounts=[...new Set(files.map(f=>f.accountId).filter(Boolean))];
 const errors=files.flatMap(f=>f.errors.map(error=>({index:f.index,error})));
 if(!files.length||errors.length)return {ready:false,files,accounts,errors,result:null};
 try{const result=mergeXtbTransactions(existing,{errors:[],transactions:files.flatMap(f=>f.preview.transactions)});return {ready:true,files,accounts,errors:[],result};}
 catch(e){return {ready:false,files,accounts,errors:[{index:null,error:e.message}],result:null};}
}
export function createXtbBatchState(state,batch){
 if(!batch.ready||!batch.result)throw Error('Resolve batch issues before importing.');
 const accounts=new Map((Array.isArray(state.xtbAccounts)?state.xtbAccounts:[]).filter(a=>a&&xtbAccountDetails(a.accountId)).map(a=>[a.accountId,a]));
 for(const f of batch.files){const p=f.preview;accounts.set(p.accountId,{accountId:p.accountId,accountType:p.accountType,accountRef:p.accountRef,currency:p.currency});}
 return {...state,transactions:batch.result.transactions,demo:false,xtbAccounts:[...accounts.values()],...(state.demo?{performance:[]}:{})};
}
