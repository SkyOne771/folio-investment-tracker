import {convert} from './core.js';
import {holdingAnchor} from './holding-change.js';
export function currencyInfluence(h,period,base,fx,fxRows,now=new Date(),series=null){
 const unavailable={price:null,currency:null,total:null,pricePercent:null,currencyPercent:null,totalPercent:null,date:null};
 if(period==='All'||!h.quote||h.quote.stale)return unavailable;
 const q=h.quote,anchor=holdingAnchor(q.history,period,now)||(series&&series.currency===q.currency&&!series.stale?holdingAnchor(series.history,period,now):null);
 if(!anchor||!(q.price>0)||!(h.quantity>0)||Date.parse(q.asOf)<Date.parse(anchor.date))return unavailable;
 const row=fxRows.filter(r=>r.base===base&&r.quote===q.currency&&r.date<=anchor.date&&r.rate>0).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 const oldRate=q.currency===base?1:row&&Date.parse(anchor.date)-Date.parse(row.date)<=7*86400000?1/row.rate:null,currentRate=convert(1,q.currency,base,fx);
 if(oldRate===null||currentRate===null)return unavailable;
 const initial=anchor.close*oldRate*h.quantity,price=(q.price-anchor.close)*oldRate*h.quantity,currency=q.price*(currentRate-oldRate)*h.quantity,total=price+currency;
 return {price,currency,total,pricePercent:price/initial*100,currencyPercent:currency/initial*100,totalPercent:total/initial*100,date:anchor.date};
}
