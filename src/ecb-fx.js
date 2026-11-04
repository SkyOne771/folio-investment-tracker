// ECB publishes each day's currency units per EUR. Cross rates must use
// values from that same day: quote units / base units.
export function parseEcbRates(xml){
 const days=[];
 for(const match of xml.matchAll(/<Cube\b[^>]*time=['"](\d{4}-\d{2}-\d{2})['"][^>]*>([\s\S]*?)<\/Cube>/g)){
  const date=match[1];if(new Date(date).toISOString().slice(0,10)!==date)throw Error('Invalid ECB date');
  const rates={EUR:1};for(const rate of match[2].matchAll(/<Cube\b[^>]*currency=['"]([A-Z]{3})['"][^>]*rate=['"]([^'"]+)['"][^>]*\/>/g)){const value=Number(rate[2]);if(!Number.isFinite(value)||value<=0)throw Error('Invalid ECB rate');rates[rate[1]]=value;}
  if(Object.keys(rates).length>1)days.push({date,rates});
 }
 if(!days.length)throw Error('ECB historical rates unavailable');
 return days.sort((a,b)=>a.date.localeCompare(b.date));
}
export function ecbCrossRates(days,base,currencies,from,to){return days.filter(d=>d.date>=from&&d.date<=to&&d.rates[base]>0).flatMap(d=>currencies.filter(quote=>d.rates[quote]>0).map(quote=>({date:d.date,base,quote,rate:d.rates[quote]/d.rates[base]})));}
