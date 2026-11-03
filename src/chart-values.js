// Rebase a price-index reference to the same opening portfolio capital.
// This is a starting-capital reference, not a simulation of later cash flows.
export function monetaryIntraday(points,metric='value'){
 const first=points.find(p=>p.value>0&&Number.isFinite(p[metric]));if(!first)return points.map(p=>({...p,chartValue:null,benchmarkValue:null,priceOnlyValue:null,currencyAmount:null}));
 return points.map(p=>{const chartValue=Number.isFinite(p[metric])?p[metric]:null,priceOnlyValue=Number.isFinite(p.priceOnly)&&chartValue!==null?chartValue+p.priceOnly-p.value:null;return {...p,chartValue,benchmarkValue:Number.isFinite(p.benchmarkReturn)?first[metric]+first.value*p.benchmarkReturn/100:null,priceOnlyValue,currencyAmount:chartValue!==null&&priceOnlyValue!==null?chartValue-priceOnlyValue:null};});
}
export function monetaryGrowth(points){const capital=points[0]?.value;if(!(capital>0))return [];return points.map(p=>({...p,chartValue:Number.isFinite(p.periodGain)?capital+p.periodGain:null,benchmarkValue:Number.isFinite(p.benchmarkPct)?capital*(1+p.benchmarkPct/100):null,priceOnlyValue:Number.isFinite(p.fixedGain)?capital+p.fixedGain:null,currencyAmount:Number.isFinite(p.currencyGain)?p.currencyGain:null}));}
