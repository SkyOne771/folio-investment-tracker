export const HOLDING_SORT_KEYS=['asset','price','quantity','value','gain','weight'];
export function sortHoldings(rows,key,direction,{name=h=>h.symbol,price=h=>h.quote?.price,totalValue=1}={}){
 if(!HOLDING_SORT_KEYS.includes(key))return [...rows];
 const value=h=>key==='asset'?name(h):key==='price'?price(h):key==='weight'?(totalValue>0?h.value:null):h[key];
 const missing=v=>v===null||v===undefined||(typeof v==='number'&&!Number.isFinite(v));
 const sign=direction==='asc'?1:-1;
 return [...rows].sort((a,b)=>{const av=value(a),bv=value(b);if(missing(av)||missing(bv))return missing(av)===missing(bv)?0:missing(av)?1:-1;const compared=key==='asset'?String(av).localeCompare(String(bv),undefined,{sensitivity:'base',numeric:true}):av-bv;return sign*compared;});
}
