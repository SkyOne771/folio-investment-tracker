// Investment-value history excludes cash. Infer net capital entering securities
// from recorded trades where available; use value minus reported profit only
// for saved account observations. Geometrically link the resulting profit rates.
// Positive net capital is assumed available before that day's return. Exact
// time-weighted returns require valuations at each external cash flow.
export function investmentGrowth(points){
 let segment=[],previous=null,wealth=1;
 for(const p of points){
  const recorded=Object.hasOwn(p,'netFlow');
  if(!Number.isFinite(p.value)||p.value<0||(recorded?(!Number.isFinite(p.netFlow)||!Number.isFinite(p.income)):!Number.isFinite(p.gain))){segment=[];previous=null;continue;}
  if(!previous){if(!(p.value>0))continue;wealth=1;segment=[{...p,growthPct:0,periodGain:0}];previous=p;continue;}
  const flow=recorded?p.netFlow-p.income:p.value-previous.value-(p.gain-previous.gain),profit=recorded?p.value-previous.value-p.netFlow+p.income:p.gain-previous.gain,capital=previous.value+Math.max(0,flow),factor=1+profit/capital;
  if(!(capital>0)||!Number.isFinite(factor)||factor<0){segment=[];previous=null;continue;}
  wealth*=factor;segment.push({...p,growthPct:(wealth-1)*100,periodGain:segment.at(-1).periodGain+profit});previous=p;
 }
 return segment;
}
export function growthBenchmark(points,index){const levels=new Map(index.map(p=>[p.date,p.level])),baseline=points.length?levels.get(points[0].date):null;return points.map(p=>({...p,benchmarkPct:baseline>0&&levels.get(p.date)>0?(levels.get(p.date)/baseline-1)*100:null}));}
export function growthCurrency(points,fixed){const fixedPoints=investmentGrowth(fixed),aligned=points.length&&fixedPoints[0]?.date===points[0].date,byDate=new Map(fixedPoints.map(p=>[p.date,p.growthPct]));return points.map(p=>{const fixedPct=aligned?byDate.get(p.date):null;return {...p,fixedPct:Number.isFinite(fixedPct)?fixedPct:null,currencyPct:Number.isFinite(fixedPct)?p.growthPct-fixedPct:null};});}
