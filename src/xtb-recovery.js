import {validateTransaction,xtbAccountDetails} from './core.js';
import {mergeXtbTransactions} from './xtb.js';
export function prepareXtbRecovery(state,data){
 if(data?.format!=='folio-xtb-recovery'||data.version!==1||!Array.isArray(data.transactions)||!data.transactions.length||data.transactions.length>20000||!Array.isArray(data.xtbAccounts)||data.xtbAccounts.length>50)throw Error('Unsupported XTB recovery file.');
 const accounts=new Map((state.xtbAccounts||[]).filter(a=>xtbAccountDetails(a?.accountId)?.currency).map(a=>[a.accountId,a]));const imported=new Set();
 for(const a of data.xtbAccounts){const details=xtbAccountDetails(a?.accountId);if(!details?.currency||details.accountType!==a.accountType||details.accountRef!==a.accountRef||details.currency!==a.currency)throw Error('Conflicting recovery account details.');accounts.set(a.accountId,{accountId:a.accountId,...details});imported.add(a.accountId);}
 const transactions=data.transactions.map(raw=>{if(raw?.source!=='xtb'||typeof raw.id!=='string'||!raw.id.startsWith(raw.accountId+':'))throw Error('Recovery contains a non-XTB or unidentifiable record.');const t=validateTransaction(raw);if(!imported.has(t.accountId))throw Error('Recovery record has no matching cash account.');return t;});
 const result=mergeXtbTransactions(state.demo?[]:state.transactions,{errors:[],transactions});
 return {...result,accounts:imported.size,state:{...state,transactions:result.transactions,xtbAccounts:[...accounts.values()],demo:false}};
}
