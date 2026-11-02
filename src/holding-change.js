import {convert} from './core.js';
export const HOLDING_PERIODS={'1D':1,'1W':7,'1M':30,'3M':90,'1Y':365,All:0};
export function holdingAnchor(history,period,now=new Date()){
 const days=HOLDING_PERIODS[period];if(!days)return null;
 const day=new Date(now);day.setUTCDate(day.getUTCDate()-days);const target=day.toISOString().slice(0,10);
 const row=[...(history||[])].filter(p=>p.date<=target&&p.close>0).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 return row&&Date.parse(target)-Date.parse(row.date)<=7*86400000?row:null;
}
export function holdingChange(h,period,base,fx,now=new Date(),series=null){
 if(period==='All')return {amount:Number.isFinite(h.gain)?h.gain:null,percent:Number.isFinite(h.gain)&&h.costBase>0?h.gain/h.costBase*100:null,date:null};
 const q=h.quote,anchor=holdingAnchor(q?.history,period,now)||(series&&q&&series.currency===q.currency&&!series.stale?holdingAnchor(series.history,period,now):null);
 if(!q||q.stale||!anchor||!(q.price>0)||Date.parse(q.asOf)<Date.parse(anchor.date))return {amount:null,percent:null,date:null};
 return {amount:convert((q.price-anchor.close)*h.quantity,q.currency,base,fx),percent:(q.price/anchor.close-1)*100,date:anchor.date};
}
