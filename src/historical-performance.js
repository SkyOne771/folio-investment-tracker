import {ledger,summary,convert,isDividendIncome} from './core.js';

// Yahoo closes are split-adjusted. Undo splits after the valuation date so
// historical share counts are valued in the units actually held that day.
export function historicalClose(series,day){
 const rows=series?.history||[];let lo=0,hi=rows.length-1,index=-1;
 while(lo<=hi){const mid=(lo+hi)>>1;if(rows[mid].date<=day){index=mid;lo=mid+1;}else hi=mid-1;}
 if(index<0)return null;
 const row=rows[index];if(Date.parse(day)-Date.parse(row.date)>7*86400000)return null;
 let price=row.close;for(const s of series.splits||[]){const date=s.day||new Date(s.date*1000).toISOString().slice(0,10);if(date>day&&Number(s.numerator)>0&&Number(s.denominator)>0)price*=s.numerator/s.denominator;}
 return Number.isFinite(price)&&price>0?price:null;
}
export function reconstructPerformance(transactions,series,fxRows,base,end=new Date().toISOString().slice(0,10),options={}){
 const tx=transactions.filter(t=>t.date<=end).sort((a,b)=>a.date.localeCompare(b.date));if(!tx.length)return {points:[],missing:[]};
 const holdingKey=h=>(h.accountId||'manual')+'|'+h.currency+'|'+h.symbol,names=new Map(tx.filter(t=>t.name).map(t=>[holdingKey(t),t.name]));
 const start=tx[0].date,points=[],missing=new Set(),rates={},currencyDates={};let cursor=0,fxCursor=0;
 const rows=[...fxRows].sort((a,b)=>a.date.localeCompare(b.date)),fixedRates={};if(options.fixedFxDate){for(const r of rows)if(r.base===base&&r.date<=options.fixedFxDate&&Date.parse(options.fixedFxDate)-Date.parse(r.date)<=7*86400000&&r.rate>0)fixedRates[r.quote]={[base]:1/r.rate};}
 for(let ms=Date.parse(start);ms<=Date.parse(end);ms+=86400000){const day=new Date(ms).toISOString().slice(0,10);
  while(cursor<tx.length&&tx[cursor].date<=day)cursor++;
  while(fxCursor<rows.length&&rows[fxCursor].date<=day){const r=rows[fxCursor++];if(r.base===base&&r.rate>0){rates[r.quote]=1/r.rate;currencyDates[r.quote]=r.date;}}
  const dayFx=options.fixedFxDate?fixedRates:Object.fromEntries(Object.entries(rates).filter(([c])=>ms-Date.parse(currencyDates[c])<=7*86400000).map(([c,rate])=>[c,{[base]:rate}]));
  const current=tx.slice(0,cursor),holdings=ledger(current).holdings,quotes={};
  for(const h of holdings){const s=series[h.symbol],price=historicalClose(s,day);if(price!==null)quotes[h.symbol]={currency:s.currency,price};}
  const total=summary(current,quotes,base,dayFx);
  const knownRows=total.rows.filter(h=>Number.isFinite(h.value)),missingHoldings=total.rows.filter(h=>!Number.isFinite(h.value)).map(h=>({key:holdingKey(h),symbol:h.symbol,name:names.get(holdingKey(h))||h.symbol,accountId:h.accountId||'manual',currency:h.marketCurrency||h.currency,reason:h.symbol.startsWith('T212-')&&!series[h.symbol]?.resolvedSymbol?'Market symbol not mapped':!quotes[h.symbol]?'Historical price unavailable':quotes[h.symbol].currency!==(h.marketCurrency||h.currency)?'Quote currency does not match instrument':'Historical FX unavailable'})),knownValue=knownRows.reduce((sum,h)=>sum+h.value,0),coverageKey=missingHoldings.map(h=>h.key).sort().join(';');
  for(const item of total.missing)missing.add(item);
  const incomeComplete=current.filter(isDividendIncome).every(t=>convert(t.amount-t.tax-t.fees,t.currency,base,dayFx)!==null);
  // Actual cash entering/leaving securities, translated on the operation day.
  // This distinguishes price/FX gains on existing capital from new purchases.
  let netFlow=0,income=0,flowsComplete=true,cashIncomeComplete=true;for(const t of current.filter(t=>t.date===day)){let target,amount;if(t.type==='buy'){target='flow';amount=t.quantity*t.price+t.fees;}else if(t.type==='sell'){target='flow';amount=-(t.quantity*t.price-t.fees);}else if(isDividendIncome(t)){target='income';amount=t.amount-t.tax-t.fees;}else continue;const converted=convert(amount,t.currency,base,dayFx);if(converted===null){if(target==='flow')flowsComplete=false;else cashIncomeComplete=false;continue;}if(target==='flow')netFlow+=converted;else income+=converted;}
  points.push({date:day,gain:total.missing.length?null:total.totalGain,value:missingHoldings.length?null:knownValue,knownValue:knownRows.length||!holdings.length?knownValue:null,coveredHoldings:knownRows.length,totalHoldings:holdings.length,missingHoldings,coverageKey,paid:incomeComplete?total.paid:null,netFlow:flowsComplete?netFlow:null,income:cashIncomeComplete?income:null});
 }
 return {points,missing:[...missing],start};
}
export function historyWindow(points,days=0,now=new Date()){
 const start=new Date(now);start.setUTCDate(start.getUTCDate()-days);const day=start.toISOString().slice(0,10);
 return points.filter(p=>!days||p.date>=day);
}

export const PERFORMANCE_METRICS={gain:'Total return',value:'Portfolio value',paid:'Dividends received'};
export function performanceMetric(value){return Object.hasOwn(PERFORMANCE_METRICS,value)?value:'gain';}
export function metricHistory(points,metric,{partialValue=false}={}){const key=performanceMetric(metric);return points.map(p=>{const partial=key==='value'&&partialValue&&!Number.isFinite(p.value)&&Number.isFinite(p.knownValue);return {...p,chartValue:partial?p.knownValue:Number.isFinite(p[key])?p[key]:null,chartPartial:partial};});}
