export const DIVIDEND_SORT_KEYS=['asset','date','amount','status'];
export function dividendStatus(event){return event.incomeKind==='tax-refund'?'Withholding tax refund':event.incomeKind==='dividend-reversal'?'Dividend reversal':event.status==='estimated'?'Estimated · gross':event.status==='broker-received'?'Received · broker amount':'Received · net';}
export function dividendSortPreference(preferences,tab){const p=preferences?.[tab];return p&&DIVIDEND_SORT_KEYS.includes(p.key)&&['asc','desc'].includes(p.direction)?p:{key:'date',direction:tab==='paid'?'desc':'asc'};}
export function sortDividends(events,key,direction,name=e=>e.symbol){
 if(!DIVIDEND_SORT_KEYS.includes(key))return [...events];
 const value=e=>key==='asset'?name(e):key==='status'?dividendStatus(e):e[key];
 const missing=v=>v===null||v===undefined||(typeof v==='number'&&!Number.isFinite(v));
 return [...events].sort((a,b)=>{const av=value(a),bv=value(b);if(missing(av)||missing(bv))return missing(av)===missing(bv)?0:missing(av)?1:-1;const result=key==='amount'?av-bv:String(av).localeCompare(String(bv),undefined,{sensitivity:'base',numeric:true});return (direction==='asc'?1:-1)*result;});
}
