import {summary,convert,CURRENCIES} from './core.js';

export function portfolioPerformance(transactions,quotes,base,fx,holdings=[],broker=null){
 const total=summary(transactions,quotes,base,fx,holdings);
 const i=broker?.investments;
 if(i&&['currentValue','totalCost','realizedProfitLoss','unrealizedProfitLoss'].every(k=>Number.isFinite(i[k]))){
  const manual=summary(transactions,quotes,base,fx);
  const amounts=Object.fromEntries(Object.entries(i).map(([k,v])=>[k,convert(v,broker.currency,base,fx)]));
  if(Object.values(amounts).some(v=>v===null)||total.missing.length)return {complete:false};
  // Use the same available position prices as allocation and holdings. Advance
  // the broker's reported P/L only by the price-value change since its snapshot.
  const priceChange=total.value-manual.value-amounts.currentValue;
  return {complete:true,value:total.value,cost:manual.cost+amounts.totalCost,gain:manual.totalGain+amounts.realizedProfitLoss+amounts.unrealizedProfitLoss+priceChange,paid:manual.paid,realized:manual.realized+amounts.realizedProfitLoss,unrealized:manual.unrealized+amounts.unrealizedProfitLoss+priceChange,brokerReported:true};
 }
 return {complete:!total.missing.length,value:total.value,cost:total.cost,gain:total.totalGain,paid:total.paid,realized:total.realized,unrealized:total.unrealized,brokerReported:false};
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
