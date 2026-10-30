import {convert} from './core.js';
export function valuationStatus(rows,quotes,base,fx,loading=false){
 const pending=[],issues=[];
 for(const h of rows){const q=quotes[h.symbol],expected=h.marketCurrency||h.currency;
  if(!q){(loading?pending:issues).push(loading?h.symbol:`${h.symbol}: price unavailable`);continue;}
  if(q.currency!==expected){issues.push(`${h.symbol}: quote is ${q.currency}, instrument is mapped to ${expected}`);continue;}
  if(convert(1,q.currency,base,fx)===null||convert(1,h.currency,base,fx)===null){if(loading)pending.push(h.symbol);else issues.push(`${h.symbol}: missing ${h.currency}/${q.currency} to ${base} exchange rate`);}
 }
 return {pending:[...new Set(pending)],issues:[...new Set(issues)]};
}
