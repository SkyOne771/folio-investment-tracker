import {validateTransaction} from './core.js';
// Backups can contain payments without their old broker snapshot. Keep only
// the connected account's API payments; manual/XTB records stay independent.
export function mergeBrokerPayments(transactions,items,broker){
 const prefix=`t212:${broker.environment}:${broker.accountId}:`;
 const byId=new Map(transactions.filter(t=>t.source!=='trading212'||typeof t.id==='string'&&t.id.startsWith(prefix)).map(t=>[t.id,t]));
 for(const item of items){const t=validateTransaction({...item,symbol:broker.mappings?.[item.brokerTicker]||item.symbol});if(t.source!=='trading212'||!t.id.startsWith(prefix))throw Error('Dividend payment belongs to another broker account.');byId.set(t.id,t);}
 return [...byId.values()];
}
