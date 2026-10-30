import {sessionDay} from './intraday.js';
const DAY=86400000;
export const BENCHMARK_SYMBOL='^GSPC';
// S&P 500 price index: distributions are excluded, unlike a total-return index.
// https://fred.stlouisfed.org/series/SP500
export function dailyBenchmark(dates,series,fxRows,base){
 const prices=[...(series?.currency==='USD'&&!series.stale?series.history||[]:[])].sort((a,b)=>a.date.localeCompare(b.date));
 const rates=fxRows.filter(r=>r.base===base&&r.quote==='USD'&&r.rate>0).sort((a,b)=>a.date.localeCompare(b.date));let pi=0,ri=0,price=null,rate=null;
 return [...dates].sort().map(date=>{while(pi<prices.length&&prices[pi].date<=date)price=prices[pi++];while(ri<rates.length&&rates[ri].date<=date)rate=rates[ri++];const close=price&&Date.parse(date)-Date.parse(price.date)<=7*DAY&&price.close>0?price.close:null,multiplier=base==='USD'?1:rate&&Date.parse(date)-Date.parse(rate.date)<=7*DAY?1/rate.rate:null;return {date,time:Date.parse(date),level:close!==null&&multiplier!==null?close*multiplier:null};});
}
export function minuteBenchmark(points,feed){
 if(!points.length)return {points:[],baseline:null};const day=sessionDay(points.at(-1).time),rows=(feed?.currency==='USD'&&!feed.stale?feed.points||[]:[]).filter(p=>p.close>0&&Number.isFinite(p.time)).sort((a,b)=>a.time-b.time),current=rows.filter(p=>sessionDay(p.time)===day),lastEarlier=rows.filter(p=>sessionDay(p.time)<day).at(-1);
 const baseline=current.length?feed.previousClose:lastEarlier&&Date.parse(day)-Date.parse(sessionDay(lastEarlier.time))<=7*DAY?lastEarlier.close:null;
 if(!(baseline>0))return {baseline:null,points:points.map(p=>({date:p.date,time:p.time,level:null}))};let index=0,level=baseline;
 return {baseline,points:points.map(p=>{while(index<current.length&&Math.floor(current[index].time/60000)*60000<=p.time)level=current[index++].close;return {date:p.date,time:p.time,level};})};
}
export function rebasedBenchmark(portfolio,indexPoints,metric,options={}){
 const index=new Map(indexPoints.map(p=>[p.time??Date.parse(p.date),p.level]));
 const first=portfolio.find(p=>Number.isFinite(p[metric])&&p.value>0&&index.get(p.time??Date.parse(p.date))>0);
 if(!first||metric==='paid')return {points:[],anchor:null};
 const capital=options.capital??first.value,offset=options.offset??first[metric],baseline=options.baseline??index.get(first.time??Date.parse(first.date));
 if(!(capital>0)||!(baseline>0)||!Number.isFinite(offset))return {points:[],anchor:null};
 const anchorTime=first.time??Date.parse(first.date);return {anchor:first.date,points:portfolio.map(p=>{const time=p.time??Date.parse(p.date),level=index.get(time),change=time>=anchorTime&&level>0?(level/baseline-1):null;return {...p,benchmark:change===null?null:offset+capital*change,benchmarkReturn:change===null?null:change*100};})};
}
export function benchmarkReturns(points,baseline){const first=baseline??points.find(p=>p.level>0)?.level;return points.map(p=>({...p,returnPct:first>0&&p.level>0?(p.level/first-1)*100:null}));}
export function seriesSegments(points,key){const segments=[];let segment=[];for(const p of points){if(Number.isFinite(p[key]))segment.push(p);else if(segment.length){segments.push(segment);segment=[];}}if(segment.length)segments.push(segment);return segments;}
