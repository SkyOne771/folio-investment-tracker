import {ledger,convert} from './core.js';
export function investedCapital(transactions,base,fx,brokerHoldings=[],broker=null){
 const holdings=ledger(transactions).holdings;let currentCost=0,purchases=0;const missing=new Set();
 const add=(amount,currency,kind)=>{const value=convert(amount,currency,base,fx);if(value===null){missing.add(currency);return false;}if(kind==='cost')currentCost+=value;else purchases+=value;return true;};
 let costComplete=true,purchasesComplete=true;
 for(const h of holdings)if(!add(h.cost,h.currency,'cost'))costComplete=false;
 if(Number.isFinite(broker?.investments?.totalCost)){if(!add(broker.investments.totalCost,broker.currency,'cost'))costComplete=false;}else for(const h of brokerHoldings)if(!add(h.cost,h.currency,'cost'))costComplete=false;
 for(const t of transactions.filter(t=>t.type==='buy'))if(!add(t.quantity*t.price+t.fees,t.currency,'purchases'))purchasesComplete=false;
 return {currentCost:costComplete?currentCost:null,purchases:purchasesComplete?purchases:null,purchaseHistoryComplete:!broker,missing:[...missing]};
}
