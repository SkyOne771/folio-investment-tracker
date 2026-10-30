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
export function reconstructPerformance(transactions,series,fxRows,base,end=new Date().toISOString().slice(0,10)){
 const tx=transactions.filter(t=>t.date<=end).sort((a,b)=>a.date.localeCompare(b.date));if(!tx.length)return {points:[],missing:[]};
 const start=tx[0].date,points=[],missing=new Set(),rates={},currencyDates={};let cursor=0,fxCursor=0;
 const rows=[...fxRows].sort((a,b)=>a.date.localeCompare(b.date));
 for(let ms=Date.parse(start);ms<=Date.parse(end);ms+=86400000){const day=new Date(ms).toISOString().slice(0,10);
  while(cursor<tx.length&&tx[cursor].date<=day)cursor++;
  while(fxCursor<rows.length&&rows[fxCursor].date<=day){const r=rows[fxCursor++];if(r.base===base&&r.rate>0){rates[r.quote]=1/r.rate;currencyDates[r.quote]=r.date;}}
  const dayFx=Object.fromEntries(Object.entries(rates).filter(([c])=>ms-Date.parse(currencyDates[c])<=7*86400000).map(([c,rate])=>[c,{[base]:rate}]));
  const current=tx.slice(0,cursor),holdings=ledger(current).holdings,quotes={};
  for(const h of holdings){const s=series[h.symbol],price=historicalClose(s,day);if(price!==null)quotes[h.symbol]={currency:s.currency,price};}
  const total=summary(current,quotes,base,dayFx);
  for(const item of total.missing)missing.add(item);
  const incomeComplete=current.filter(isDividendIncome).every(t=>convert(t.amount-t.tax-t.fees,t.currency,base,dayFx)!==null);
  points.push({date:day,gain:total.missing.length?null:total.totalGain,value:total.rows.some(h=>h.value===null)?null:total.value,paid:incomeComplete?total.paid:null});
 }
 return {points,missing:[...missing],start};
}
export function historyWindow(points,days=0,now=new Date()){
 const start=new Date(now);start.setUTCDate(start.getUTCDate()-days);const day=start.toISOString().slice(0,10);
 return points.filter(p=>!days||p.date>=day);
}

export const PERFORMANCE_METRICS={gain:'Total return',value:'Portfolio value',paid:'Dividends received'};
export function performanceMetric(value){return Object.hasOwn(PERFORMANCE_METRICS,value)?value:'gain';}
export function metricHistory(points,metric){const key=performanceMetric(metric);return points.map(p=>({...p,chartValue:Number.isFinite(p[key])?p[key]:null}));}
