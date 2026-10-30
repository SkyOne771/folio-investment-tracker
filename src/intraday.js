import {convert} from './core.js';
const dayFormatters=new Map();
export function sessionDay(time,timeZone='Europe/Warsaw'){if(!dayFormatters.has(timeZone))dayFormatters.set(timeZone,new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}));return dayFormatters.get(timeZone).format(new Date(time));}
export function intradayPortfolio(holdings,feeds,base,fx,totals={},timeZone='Europe/Warsaw',allowPartial=false){
 const missing=[],all=holdings.flatMap(h=>feeds[h.symbol]?.points||[]);if(!all.length)return {points:[],missing:holdings.map(h=>h.symbol)};
 const day=sessionDay(Math.max(...all.map(p=>p.time)),timeZone),prepared=[];
 for(const h of holdings){const feed=feeds[h.symbol],expected=h.marketCurrency||h.currency;if(!feed||feed.currency!==expected||feed.stale){missing.push(h.symbol);continue;}
  const points=feed.points.filter(p=>sessionDay(p.time,timeZone)===day).sort((a,b)=>a.time-b.time),earlier=feed.points.filter(p=>sessionDay(p.time,timeZone)<day).at(-1);
  const previous=points.length?feed.previousClose:earlier?.close;
  if(!Number.isFinite(previous)||previous<=0||convert(1,feed.currency,base,fx)===null){missing.push(h.symbol);continue;}
  prepared.push({holding:h,feed,points,price:previous,previous,cursor:0});
 }
 if(missing.length&&!allowPartial)return {points:[],missing:[...new Set(missing)],day};
 const active=prepared.flatMap(p=>p.points);if(!active.length)return {points:[],missing:[...new Set(missing)],covered:prepared.length,total:holdings.length,day};
 const start=Math.floor(Math.min(...active.map(p=>p.time))/60000)*60000,end=Math.floor(Math.max(...active.map(p=>p.time))/60000)*60000;
 const baseline=prepared.reduce((sum,p)=>sum+convert(p.holding.quantity*p.previous,p.feed.currency,base,fx),0),points=[];
 for(let time=start;time<=end;time+=60000){let value=0;for(const p of prepared){while(p.cursor<p.points.length&&Math.floor(p.points[p.cursor].time/60000)*60000<=time)p.price=p.points[p.cursor++].close;value+=convert(p.holding.quantity*p.price,p.feed.currency,base,fx);}
  points.push({time,date:new Date(time).toISOString(),value,gain:!missing.length&&Number.isFinite(totals.gain)&&Number.isFinite(totals.value)?totals.gain-totals.value+value:null});
 }
 const latest=points.at(-1);return {points,missing:[...new Set(missing)],covered:prepared.length,total:holdings.length,day,baseline,change:latest.value-baseline,changePercent:baseline?(latest.value-baseline)/baseline*100:null};
}
