import {convert,isDividendIncome} from './core.js';

export function dividendIncome(transactions,events,base,fx,year=new Date().getUTCFullYear(),now=new Date()){
 const current=now.toISOString().slice(0,10),months=Array.from({length:12},(_,i)=>({key:`${year}-${String(i+1).padStart(2,'0')}`,received:0,estimated:0}));
 let allTime=0,thisMonth=0,thisYear=0;const missing=new Set();
 for(const t of transactions){if(!isDividendIncome(t)||t.date>current)continue;const value=convert(t.amount-t.tax-t.fees,t.currency,base,fx),m=months.find(m=>m.key===t.date.slice(0,7));
  if(value===null){missing.add(t.currency);allTime=null;if(m)m.received=null;if(t.date.slice(0,7)===current.slice(0,7))thisMonth=null;if(t.date.slice(0,4)===current.slice(0,4))thisYear=null;continue;}
  if(allTime!==null)allTime+=value;if(m&&m.received!==null)m.received+=value;if(t.date.slice(0,7)===current.slice(0,7)&&thisMonth!==null)thisMonth+=value;if(t.date.slice(0,4)===current.slice(0,4)&&thisYear!==null)thisYear+=value;
 }
 for(const e of events){if(e.date<=current)continue;const m=months.find(m=>m.key===e.date.slice(0,7));if(m&&Number.isFinite(e.amount))m.estimated+=e.amount;}
 return {months,allTime,thisMonth,thisYear,received:months.some(m=>m.received===null)?null:months.reduce((a,m)=>a+m.received,0),estimated:months.reduce((a,m)=>a+m.estimated,0),missing:[...missing]};
}
