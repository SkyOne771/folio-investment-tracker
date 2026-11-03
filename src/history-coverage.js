// Coverage is by holding count, never an estimated percentage of missing value.
export function coverageSegments(points,key='chartValue'){
 const result=[];let segment=[],identity=null;
 for(const p of points){const next=p.coverageKey??'';if(!Number.isFinite(p[key])){if(segment.length)result.push(segment);segment=[];identity=null;continue;}if(segment.length&&next!==identity){result.push(segment);segment=[];}identity=next;segment.push(p);}if(segment.length)result.push(segment);return result;
}
export function coverageReport(points){let completeDays=0,partialDays=0,unavailableDays=0;const missing=new Map();for(const p of points){if(p.totalHoldings===undefined)continue;if(!p.missingHoldings?.length)completeDays++;else if(p.coveredHoldings>0)partialDays++;else unavailableDays++;for(const h of p.missingHoldings||[]){const old=missing.get(h.key)||{...h,days:0,from:p.date,to:p.date,reasons:[]};old.days++;old.to=p.date;if(!old.reasons.includes(h.reason))old.reasons.push(h.reason);missing.set(h.key,old);}}return {completeDays,partialDays,unavailableDays,missing:[...missing.values()].sort((a,b)=>b.days-a.days||a.symbol.localeCompare(b.symbol))};}
