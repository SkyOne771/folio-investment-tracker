export const CURRENCIES=['PLN','USD','EUR','GBP','CHF','CAD','JPY','AUD','SEK','DKK'];
export function displayCurrency(state){return state?.displayCurrencyVersion===1&&CURRENCIES.includes(state.base)?state.base:'PLN';}
export function fxMatrix(snapshot){
 if(!snapshot||!CURRENCIES.includes(snapshot.base)||!snapshot.rates)throw Error('Invalid FX snapshot.');
 const rates={...snapshot.rates,[snapshot.base]:1};
 for(const currency of CURRENCIES)if(!Number.isFinite(rates[currency])||rates[currency]<=0)throw Error('Incomplete FX snapshot.');
 return Object.fromEntries(CURRENCIES.map(from=>[from,Object.fromEntries(CURRENCIES.map(to=>[to,rates[to]/rates[from]]))]));
}
// Amundi's WEBQ Xetra listing trades in USD despite its German exchange suffix.
// Listing reference: https://www.amundietf.se/en/individual/products/equity/amundi-prime-all-country-world-ucits-etf-acc/ie0003xja0j9
export function xtbTradingCurrency(symbol,assumed){return symbol==='WEBQ.DE'?'USD':assumed;}
export function xtbAccountDetails(id){const m=String(id||'').match(/^xtb:(ike|regular):([A-Za-z0-9-]{3,64})(?::([A-Z]{3}))?$/);return m&&(!m[3]||CURRENCIES.includes(m[3]))?{accountType:m[1],accountRef:m[2],currency:m[3]||null}:null;}
export function xtbAccountId(type,reference,currency){return `xtb:${type}:${reference}:${currency}`;}
export function migrateXtbAccounts(state){
 const replacements=new Map();const transactions=state.transactions.map(old=>{const t=validateTransaction(old);if(old.source==='xtb'){if(!replacements.has(old.accountId))replacements.set(old.accountId,new Set());replacements.get(old.accountId).add(t.accountId);}return t;});
 const performance=Array.isArray(state.performance)?state.performance.map(p=>{if(!p||typeof p!=='object')return p;let scope=p.scope,identity=p.identity;const scopes=replacements.get(scope);if(scopes?.size>1)return p;if(scopes?.size===1)scope=[...scopes][0];try{const parsed=JSON.parse(identity);if(Array.isArray(parsed)&&Array.isArray(parsed[1])){parsed[1]=[...new Set(parsed[1].flatMap(id=>replacements.has(id)?[...replacements.get(id)]:[id]))].sort();identity=JSON.stringify(parsed);}}catch{}return {...p,scope,identity};}):state.performance;
 return {...state,transactions,...(performance?{performance}:{})};
}
export const TYPES=['buy','sell','dividend','split','income-adjustment'];
export function isDividendIncome(t){return t.type==='dividend'||t.type==='income-adjustment';}
export function validateTransaction(input){
 const t={id:input.id||globalThis.crypto.randomUUID(),symbol:String(input.symbol||'').trim().toUpperCase(),type:input.type,date:input.date,currency:input.currency,quantity:Number(input.quantity||0),price:Number(input.price||0),fees:Number(input.fees||0),tax:Number(input.tax||0),amount:Number(input.amount||0)};
 if(typeof input.name==='string'&&input.name.trim())t.name=input.name.trim().slice(0,200);
 if(!/^[A-Z0-9^][A-Z0-9.^=\-]{0,24}$/.test(t.symbol))throw Error('Enter a valid ticker, for example AAPL or VWCE.DE.');
 if(!TYPES.includes(t.type)||!CURRENCIES.includes(t.currency))throw Error('Invalid transaction type or currency.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||Number.isNaN(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date||t.date>new Date().toISOString().slice(0,10))throw Error('Choose a valid date on or before today.');
 for(const k of ['quantity','price','fees','tax','amount'])if(!Number.isFinite(t[k])||(t[k]<0&&!(k==='amount'&&t.type==='income-adjustment'))||Math.abs(t[k])>1e12)throw Error('Amounts must be finite, nonnegative numbers.');
 if(['buy','sell','split'].includes(t.type)&&t.quantity<=0)throw Error('Quantity must be positive.');
 if(['buy','sell'].includes(t.type)&&t.price<=0)throw Error('Price must be positive.');
 if(t.type==='dividend'&&(t.amount<=0||t.tax+t.fees>t.amount))throw Error('Dividend gross amount must cover tax and fees.');
 if(t.type==='income-adjustment'){if(input.source!=='xtb'||!['tax-refund','dividend-reversal'].includes(input.incomeKind)||t.amount===0||t.tax!==0||t.fees!==0||(input.incomeKind==='tax-refund'&&t.amount<0)||(input.incomeKind==='dividend-reversal'&&t.amount>0))throw Error('Invalid imported dividend adjustment.');t.incomeKind=input.incomeKind;}
 if(input.source==='xtb'){
  const account=xtbAccountDetails(input.accountId);
  if(!account||account.accountType!==input.accountType||(account.currency&&account.currency!==t.currency)||(input.accountRef&&input.accountRef!==account.accountRef)||!CURRENCIES.includes(input.marketCurrency))throw Error('Invalid or conflicting XTB account metadata.');
  t.source='xtb';for(const k of ['accountType','marketCurrency','brokerSymbol','occurredAt','executionPrice','matchedPosition','reportedPrincipal'])if(input[k]!==undefined)t[k]=input[k];
  t.accountRef=account.accountRef;t.accountId=xtbAccountId(account.accountType,account.accountRef,t.currency);
  if(t.id.startsWith(input.accountId+':')&&!t.id.startsWith(t.accountId+':'))t.id=t.accountId+t.id.slice(input.accountId.length);
  t.marketCurrency=xtbTradingCurrency(t.symbol,t.marketCurrency);
 }
 if(input.source==='trading212'){t.source='trading212';if(typeof input.brokerTicker==='string')t.brokerTicker=input.brokerTicker;}
 return t;
}
export function ledger(transactions){
 const holdings={},realized={};
 for(const t of [...transactions].sort((a,b)=>a.date.localeCompare(b.date)||(a.occurredAt||'').localeCompare(b.occurredAt||''))){
  if(isDividendIncome(t))continue;
  const key=(t.accountId||'manual')+(t.source==='xtb'?'|'+t.currency:'')+'|'+t.symbol;
  const h=holdings[key]||={symbol:t.symbol,currency:t.currency,quantity:0,cost:0,accountId:t.accountId,accountType:t.accountType,accountRef:t.accountRef,source:t.source,marketCurrency:t.marketCurrency};
  if(h.currency!==t.currency)throw Error(`${t.symbol}: transactions must use the same trading currency.`);
  if(t.type==='buy'){h.quantity+=t.quantity;h.cost+=t.quantity*t.price+t.fees;}
  if(t.type==='split'){h.quantity*=t.quantity;}
  if(t.type==='sell'){
   if(t.quantity>h.quantity+1e-8)throw Error(`${t.symbol}: sale exceeds shares owned on ${t.date}.`);
   const cost=h.quantity?h.cost*t.quantity/h.quantity:0;
   realized[t.currency]=(realized[t.currency]||0)+t.quantity*t.price-t.fees-cost;
   h.quantity-=t.quantity;h.cost-=cost;
  }
 }
 return {holdings:Object.values(holdings).filter(h=>h.quantity>1e-8),realized};
}
export function convert(amount,from,to,fx){if(from===to)return amount;const rate=fx[from]?.[to];return Number.isFinite(rate)&&rate>0?amount*rate:null;}
export function summary(transactions,quotes,base,fx,brokerHoldings=[]){
 const {holdings,realized}=ledger(transactions);let value=0,cost=0,paid=0,gainRealized=0;const missing=[];
 const rows=[...holdings,...brokerHoldings].map(h=>{const q=quotes[h.symbol];const v=q&&q.currency===(h.marketCurrency||h.currency)?convert(h.quantity*q.price,q.currency,base,fx):null;const c=convert(h.cost,h.currency,base,fx);if(v===null||c===null)missing.push(h.symbol);else {value+=v;cost+=c;}return {...h,quote:q,value:v,costBase:c,gain:v===null||c===null?null:v-c};});
 for(const t of transactions.filter(isDividendIncome)){const n=convert(t.amount-t.tax-t.fees,t.currency,base,fx);if(n===null)missing.push(`${t.currency} dividends`);else paid+=n;}
 for(const [currency,amount] of Object.entries(realized)){const n=convert(amount,currency,base,fx);if(n===null)missing.push(`${currency} gains`);else gainRealized+=n;}
 return {rows,value,cost,paid,realized:gainRealized,unrealized:value-cost,totalGain:value-cost+paid+gainRealized,missing:[...new Set(missing)]};
}
export function forecast(holdings,quotes,base,fx,now=new Date()){
 const today=now.toISOString().slice(0,10),end=new Date(now);end.setUTCFullYear(end.getUTCFullYear()+1);const start=new Date(now);start.setUTCFullYear(start.getUTCFullYear()-1);
 const events=[],missing=[];
 for(const h of holdings){const q=quotes[h.symbol];if(!q||q.currency!==(h.marketCurrency||h.currency)){missing.push(h.symbol);continue;}
  // Historical events carry ex-dividend dates, never confirmed payment dates.
  const dividends=(q.dividends||[]).filter(d=>d.date>start.toISOString().slice(0,10)&&d.date<=today);
  for(const d of dividends){for(const yearOffset of [0,1]){const estimate=new Date(d.date+'T12:00:00Z');estimate.setUTCFullYear(estimate.getUTCFullYear()+yearOffset);estimate.setUTCDate(estimate.getUTCDate()+21);const date=estimate.toISOString().slice(0,10);if(date<=today||date>end.toISOString().slice(0,10))continue;
   const amount=convert(d.amount*h.quantity,q.currency,base,fx);if(amount===null){missing.push(h.symbol);continue;}events.push({symbol:h.symbol,accountId:h.accountId||(h.source==='trading212'?'trading212':undefined),date,amount,perShare:d.amount,quantity:h.quantity,currency:q.currency,status:'estimated',basis:d.date});
  }}
 }
 return {events:events.sort((a,b)=>a.date.localeCompare(b.date)||(a.occurredAt||'').localeCompare(b.occurredAt||'')),total:events.reduce((a,e)=>a+e.amount,0),missing:[...new Set(missing)]};
}
export function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(c==='\n'){rows.push(row);row=[];}}else cell+=c;}
 if(quoted)throw Error('Unclosed CSV quote.');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}const header=rows.shift()?.map(x=>x.trim().toLowerCase().replace(/^\uFEFF/,''));
 if(!['type','symbol','date','currency'].every(x=>header?.includes(x)))throw Error('CSV needs type,symbol,date,currency columns.');
 return rows.filter(r=>r.some(Boolean)).map((r,i)=>{if(r.length!==header.length)throw Error(`CSV row ${i+2}: wrong number of fields.`);try{return validateTransaction(Object.fromEntries(header.map((h,j)=>[h,r[j]])));}catch(e){throw Error(`CSV row ${i+2}: ${e.message}`);}});
}

export function convertedHistory(history,from,to,fx){const rate=convert(1,from,to,fx);if(rate===null)return [];return (history||[]).filter(p=>Number.isFinite(p.close)&&p.close>0).map(p=>({...p,close:p.close*rate}));}
