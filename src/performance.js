import {summary,convert,CURRENCIES,ledger,isDividendIncome} from './core.js';

export function portfolioPerformance(transactions,quotes,base,fx,holdings=[],broker=null){
 const total=summary(transactions,quotes,base,fx,holdings);
 const known=total.rows.filter(r=>Number.isFinite(r.value)),coverage={knownValue:known.length||!total.rows.length?known.reduce((sum,r)=>sum+r.value,0):null,coveredHoldings:known.length,totalHoldings:total.rows.length,valueComplete:known.length===total.rows.length};
 const sumConverted=rows=>{const values=rows.map(([amount,currency])=>convert(amount,currency,base,fx));return values.some(v=>v===null)?null:values.reduce((a,v)=>a+v,0);},paid=sumConverted(transactions.filter(isDividendIncome).map(t=>[t.amount-t.tax-t.fees,t.currency])),realized=sumConverted(Object.entries(ledger(transactions).realized).map(([currency,amount])=>[amount,currency]));
 const i=broker?.investments;
 if(i&&['currentValue','totalCost','realizedProfitLoss','unrealizedProfitLoss'].every(k=>Number.isFinite(i[k]))){
  const manual=summary(transactions,quotes,base,fx);
  const amounts=Object.fromEntries(Object.entries(i).map(([k,v])=>[k,convert(v,broker.currency,base,fx)]));
  if(Object.values(amounts).some(v=>v===null)||total.missing.length)return {...coverage,complete:false,value:coverage.valueComplete?coverage.knownValue:null,gain:null,unrealized:null,paid,realized:realized!==null&&amounts.realizedProfitLoss!==null?realized+amounts.realizedProfitLoss:null};
  // Use the same available position prices as allocation and holdings. Advance
  // the broker's reported P/L only by the price-value change since its snapshot.
  const priceChange=total.value-manual.value-amounts.currentValue;
  return {...coverage,complete:true,value:total.value,cost:manual.cost+amounts.totalCost,gain:manual.totalGain+amounts.realizedProfitLoss+amounts.unrealizedProfitLoss+priceChange,paid:manual.paid,realized:manual.realized+amounts.realizedProfitLoss,unrealized:manual.unrealized+amounts.unrealizedProfitLoss+priceChange,brokerReported:true};
 }
 return {...coverage,complete:!total.missing.length,value:coverage.valueComplete?coverage.knownValue:null,cost:total.cost,gain:total.missing.length?null:total.totalGain,paid,realized,unrealized:total.missing.length?null:total.unrealized,brokerReported:false};
}

export function recordPerformance(history,scope,identity,values,now=new Date()){
 const day=now.toISOString().slice(0,10);
 const valid=Object.fromEntries(Object.entries(values).filter(([c,v])=>CURRENCIES.includes(c)&&v.complete&&['gain','value','cost','paid','realized','unrealized'].every(k=>Number.isFinite(v[k]))));
 const clean=Array.isArray(history)?history.filter(p=>p&&typeof p.day==='string'&&p.values):[];
 if(!Object.keys(valid).length)return clean;
 return [...clean.filter(p=>!(p.scope===scope&&p.identity===identity&&p.day===day)),{scope,identity,day,values:valid}].sort((a,b)=>a.day.localeCompare(b.day)).slice(-4000);
}

export function performanceHistory(history,scope,identity,currency,days=0,now=new Date()){
 const start=new Date(now);if(days)start.setUTCDate(start.getUTCDate()-days);
 return (Array.isArray(history)?history:[]).filter(p=>p?.scope===scope&&p.identity===identity&&(!days||p.day>=start.toISOString().slice(0,10))&&Number.isFinite(p.values?.[currency]?.gain)).sort((a,b)=>a.day.localeCompare(b.day)).map(p=>({date:p.day,...p.values[currency]}));
}
