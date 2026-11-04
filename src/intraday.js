import {convert} from './core.js';
const dayFormatters=new Map();
export function sessionDay(time,timeZone='Europe/Warsaw'){if(!dayFormatters.has(timeZone))dayFormatters.set(timeZone,new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}));return dayFormatters.get(timeZone).format(new Date(time));}
export function intradayPortfolio(holdings,feeds,base,fx,totals={},timeZone='Europe/Warsaw',allowPartial=false,requestedDay=null){
 const missing=[],carried=[],extended=[],all=holdings.flatMap(h=>feeds[h.symbol]?.points||[]);if(!all.length)return {points:[],missing:holdings.map(h=>h.symbol)};
 const latestDay=sessionDay(Math.max(...all.map(p=>p.time)),timeZone),day=requestedDay||latestDay,prepared=[];
 for(const h of holdings){const feed=feeds[h.symbol],expected=h.marketCurrency||h.currency;if(!feed||feed.currency!==expected||feed.stale){missing.push(h.symbol);continue;}
  const points=feed.points.filter(p=>sessionDay(p.time,timeZone)===day).sort((a,b)=>a.time-b.time),earlier=feed.points.filter(p=>sessionDay(p.time,timeZone)<day).at(-1);
  const previous=points.length?feed.previousClose:earlier?.close??feed.previousClose;
  if(!Number.isFinite(previous)||previous<=0||convert(1,feed.currency,base,fx)===null){missing.push(h.symbol);continue;}
  if(!points.length)carried.push(h.symbol);if(points.some(p=>['pre','post'].includes(p.marketSession)))extended.push(h.symbol);
  prepared.push({holding:h,feed,points,price:earlier?.close??previous,previous,cursor:0});
 }
 if(missing.length&&!allowPartial)return {points:[],missing:[...new Set(missing)],day};
 const active=prepared.flatMap(p=>p.points);if(!active.length)return {points:[],missing:[...new Set(missing)],covered:prepared.length,total:holdings.length,day,latestDay,awaitingSession:!!requestedDay&&latestDay<requestedDay};
 const start=Math.floor(Math.min(...active.map(p=>p.time))/60000)*60000,end=Math.floor(Math.max(...active.map(p=>p.time))/60000)*60000;
 const baseline=prepared.reduce((sum,p)=>sum+convert(p.holding.quantity*p.previous,p.feed.currency,base,fx),0),points=[];
 for(let time=start;time<=end;time+=60000){let value=0;const marketSessions=new Set();for(const p of prepared){while(p.cursor<p.points.length&&Math.floor(p.points[p.cursor].time/60000)*60000<=time){const tick=p.points[p.cursor++];p.price=tick.close;p.marketSession=tick.marketSession;}if(['pre','post'].includes(p.marketSession))marketSessions.add(p.marketSession);value+=convert(p.holding.quantity*p.price,p.feed.currency,base,fx);}
  points.push({time,marketSessions:[...marketSessions],date:new Date(time).toISOString(),value,gain:!missing.length&&Number.isFinite(totals.gain)&&Number.isFinite(totals.value)?totals.gain-totals.value+value:null});
 }
 const latest=points.at(-1);return {points,extended:[...new Set(extended)],carried:[...new Set(carried)],missing:[...new Set(missing)],covered:prepared.length,total:holdings.length,day,latestDay,baseline,change:latest.value-baseline,changePercent:baseline?(latest.value-baseline)/baseline*100:null};
}

// A dated close is a constant baseline, never an invented minute trade.
export function confirmedCloseFeed(symbol,quote,now=Date.now()){
 if(!quote||!Number.isFinite(Date.parse(quote.asOf))||Date.parse(quote.asOf)>now||now-Date.parse(quote.asOf)>7*86400000)return null;
 const price=sessionDay(Date.parse(quote.asOf))<sessionDay(now)?quote.price:quote.previousClose;
 return Number.isFinite(price)&&price>0?{symbol,currency:quote.currency,previousClose:price,points:[],asOf:quote.asOf,closeFallback:true,source:'Last confirmed close · minute feed unavailable'}:null;
}
