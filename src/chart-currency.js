// Same current holdings and prices in both curves. Only exchange rates differ.
export function currencyMinutePortfolio(points,holdings,priceFeeds,fxFeeds,base){
 if(!points.length)return {points:[],missing:[]};const start=points[0].time,missing=[],prepared=[];
 const before=(rows,time)=>rows.filter(p=>p.time<=time&&p.close>0).at(-1);
 for(const h of holdings){const feed=priceFeeds[h.symbol],currency=feed?.currency;if(!feed||feed.stale){missing.push(h.symbol);continue;}const prices=[...(feed.points||[])].map(p=>({...p,time:Math.floor(p.time/60000)*60000})).sort((a,b)=>a.time-b.time),rates=currency===base?[]:[...(fxFeeds[currency]?.points||[])].map(p=>({...p,time:Math.floor(p.time/60000)*60000})).sort((a,b)=>a.time-b.time),firstRate=currency===base?1:before(rates,start)?.close;
  if(!(firstRate>0)||currency!==base&&(fxFeeds[currency]?.currency!==base||fxFeeds[currency]?.stale||start-(before(rates,start)?.time||0)>7*86400000)){missing.push(currency||h.symbol);continue;}
  const earlier=before(prices,start);prepared.push({h,prices,rates,fixed:firstRate,rate:firstRate,price:earlier?.close??feed.previousClose,pc:0,rc:0});
 }
 if(missing.length)return {points:[],missing:[...new Set(missing)]};
 let initial=null;const result=points.map(p=>{let value=0,priceOnly=0;for(const x of prepared){while(x.pc<x.prices.length&&x.prices[x.pc].time<=p.time)x.price=x.prices[x.pc++].close;while(x.rc<x.rates.length&&x.rates[x.rc].time<=p.time)x.rate=x.rates[x.rc++].close;value+=x.h.quantity*x.price*x.rate;priceOnly+=x.h.quantity*x.price*x.fixed;}initial??=value;return {...p,value,gain:Number.isFinite(p.gain)?p.gain+value-p.value:null,priceOnly,priceOnlyPct:initial>0?(priceOnly/initial-1)*100:null,currencyPct:initial>0?(value-priceOnly)/initial*100:null};});return {points:result,missing:[]};
}

export function currencyIndexPoints(points,feed,base){if(base==='USD')return points;const rates=[...(feed?.points||[])].map(p=>({...p,time:Math.floor(p.time/60000)*60000})).sort((a,b)=>a.time-b.time);return points.map(p=>{const rate=rates.filter(r=>r.time<=p.time&&r.close>0).at(-1);return {...p,level:feed?.currency===base&&!feed?.stale&&rate&&p.time-rate.time<=7*86400000&&p.level>0?p.level*rate.close:null};});}

export function historicalCurrencyPoints(actual,fixed,metric){const byDate=new Map(fixed.map(p=>[p.date,p]));return actual.map(p=>{const value=byDate.get(p.date)?.[metric];return {...p,fixedMetric:Number.isFinite(p[metric])&&Number.isFinite(value)?value:null,currencyMetric:Number.isFinite(p[metric])&&Number.isFinite(value)?p[metric]-value:null};});}
export function currencyComparisonPoints(actual,fixed){if(!actual.length||!fixed.length||actual[0].date!==fixed[0].date)return actual.map(p=>({...p,fixedPct:null,currencyPct:null}));const byDate=new Map(fixed.map(p=>[p.date,p.portfolioPct]));return actual.map(p=>{const fixedPct=byDate.get(p.date);return {...p,fixedPct:Number.isFinite(fixedPct)?fixedPct:null,currencyPct:Number.isFinite(fixedPct)?p.portfolioPct-fixedPct:null};});}
