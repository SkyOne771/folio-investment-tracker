import {CURRENCIES} from './core.js';
export const T212_ORIGINS={live:'https://live.trading212.com',demo:'https://demo.trading212.com'};
const fail=(message,status=502)=>{const e=new Error(message);e.status=status;throw e;};
export {marketSymbol} from './market-mapping.js';
import {marketSymbol} from './market-mapping.js';
export function dividendCursor(path){if(!path)return null;if(typeof path!=='string'||path.length>2000)fail('Invalid dividend pagination response.');const url=new URL(path,'https://live.trading212.com');if(url.pathname!=='/api/v0/equity/history/dividends'||!['https://live.trading212.com','https://demo.trading212.com'].includes(url.origin))fail('Unsafe dividend pagination response.');const cursor=url.searchParams.get('cursor');if(!cursor||!/^[A-Za-z0-9._-]{1,200}$/.test(cursor))fail('Invalid dividend cursor.');return cursor;}
export function normalizePositions(rows,instruments=[]){
 if(!Array.isArray(rows))fail('Trading 212 position schema changed: expected a list.');
 const metadata=new Map(instruments.map(i=>[i.ticker,i]));
 const number=v=>typeof v==='number'?v:typeof v==='string'&&/^-?\d+(?:\.\d+)?$/.test(v)?Number(v):NaN;
 return rows.map((p,index)=>{
  const bad=field=>fail(`Trading 212 position ${index+1}: unsupported or missing ${field}. No snapshot was replaced.`);
  if(!p||typeof p!=='object')return bad('position object');
  const quantity=number(p.quantity);if(!Number.isFinite(quantity)||quantity<0)return bad('quantity');
  // Some accounts include empty position stubs with no usable pricing fields.
  if(quantity===0)return null;
  const nested=p.instrument&&typeof p.instrument==='object'?p.instrument:{},ticker=nested.ticker||p.ticker;
  if(typeof ticker!=='string'||!/^[A-Z0-9a-z_.-]{1,50}$/.test(ticker))return bad('instrument ticker');
  const i={...(metadata.get(ticker)||{}),...nested};
  const native=i.currency||i.currencyCode||p.currency||p.currencyCode;
  const minor=native==='GBX'||native==='GBp',currency=minor?'GBP':native,scale=minor?.01:1;
  if(!CURRENCIES.includes(currency))return bad(native&&/^[A-Za-z]{3}$/.test(native)?`instrument currency (${native})`:'instrument currency (Metadata read permission may be required)');
  const average=number(p.averagePricePaid??p.averagePrice),price=number(p.currentPrice);
  if(!Number.isFinite(average)||average<0)return bad('average acquisition price');
  if(!Number.isFinite(price)||price<0)return bad('current price');
  const cost=quantity*average*scale;if(!Number.isFinite(cost))return bad('cost');
  return {brokerTicker:ticker,marketSymbol:marketSymbol(ticker,{isin:i.isin,currency}),name:String(i.name||p.name||ticker),isin:String(i.isin||''),currency,quantity,cost,currentPrice:price*scale};
 }).filter(Boolean);
}
export function normalizeDividends(data,accountId,environment,accountCurrency){if(!Array.isArray(data?.items))fail('Trading 212 dividend schema changed.');const items=data.items.map(d=>{const ticker=d.instrument?.ticker||d.ticker;const currency=d.currency||d.currencyCode||accountCurrency;if(typeof ticker!=='string'||!/^[A-Za-z0-9_.-]{1,50}$/.test(ticker)||typeof d.reference!=='string'||d.reference.length>200||!d.reference||!Number.isFinite(d.amount)||d.amount<0||!CURRENCIES.includes(currency)||!Number.isFinite(Date.parse(d.paidOn)))fail('Trading 212 returned an unsupported dividend. No payments were imported.');return {id:`t212:${environment}:${accountId}:${d.reference}`,brokerTicker:ticker,...(typeof(d.instrument?.name||d.name)==='string'?{name:String(d.instrument?.name||d.name).slice(0,200)}:{}),symbol:marketSymbol(ticker)||ticker.replaceAll('_','-').toUpperCase(),type:'dividend',date:new Date(d.paidOn).toISOString().slice(0,10),currency,quantity:0,price:0,fees:0,tax:0,amount:d.amount,source:'trading212',paymentType:String(d.type||'DIVIDEND')};}).filter(d=>d.amount>0&&!/INTEREST|CAPITAL_GAINS|RETURN_OF_CAPITAL|TAX_EVENT|DEMERGER|LIQUIDATION/.test(d.paymentType));return {items,nextCursor:dividendCursor(data.nextPagePath)};}
export async function trading212(body,fetcher=fetch){
 if(!body||!['live','demo'].includes(body.environment)||typeof body.apiKey!=='string'||typeof body.apiSecret!=='string'||!body.apiKey||!body.apiSecret||body.apiKey.length>512||body.apiSecret.length>512||/[:\s\x00-\x1f]/.test(body.apiKey)||/[^\x21-\x7e]/.test(body.apiSecret))fail('Enter your Trading 212 API key and API secret, and select Live or Demo.',400);
 if(!['snapshot','dividends'].includes(body.action))fail('Unsupported broker action.',400);
 if(body.cursor!==undefined&&body.cursor!==null&&!/^[A-Za-z0-9._-]{1,200}$/.test(body.cursor))fail('Invalid pagination cursor.',400);
 const origin=T212_ORIGINS[body.environment],auth='Basic '+btoa(body.apiKey+':'+body.apiSecret);
 const get=async path=>{let r;try{r=await fetcher(origin+path,{method:'GET',headers:{Authorization:auth,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15000)});}catch{fail('Trading 212 could not be reached. Try again shortly.');}if(r.status>=300&&r.status<400)fail('Trading 212 returned a redirect. It was blocked to protect your credentials.');if(!r.ok){if(r.status===401||r.status===403)fail('Trading 212 rejected access. Check the key/secret, read permissions, environment and IP restrictions.',r.status);if(r.status===429)fail('Trading 212 rate limit reached. Wait at least one minute before retrying.',429);fail(`Trading 212 returned HTTP ${r.status}.`);}try{return await r.json();}catch{fail('Invalid response from Trading 212.');}};
 const account=await get('/api/v0/equity/account/summary');if(!Number.isSafeInteger(account.id)||!CURRENCIES.includes(account.currency))fail('Unsupported Trading 212 account response.');
 if(body.action==='dividends'){if(String(body.accountId)!==String(account.id))fail('Account changed. Reconnect before loading older dividends.',409);const data=await get('/api/v0/equity/history/dividends?limit=50'+(body.cursor?'&cursor='+encodeURIComponent(body.cursor):''));return {accountId:String(account.id),...normalizeDividends(data,account.id,body.environment,account.currency)};}
 const rawPositions=await get('/api/v0/equity/positions');
 let instruments=[];
 if(Array.isArray(rawPositions)&&rawPositions.some(p=>p?.quantity>0&&!(p.instrument?.currency||p.instrument?.currencyCode||p.currency||p.currencyCode))){
  try{instruments=await get('/api/v0/equity/metadata/instruments');if(!Array.isArray(instruments))fail('Invalid instrument metadata.');}catch(e){if(e.status===401||e.status===403)fail('Trading 212 did not include instrument currencies. Enable Metadata read permission on this API key, then reconnect. No snapshot was replaced.');fail('Instrument metadata unavailable: '+e.message,e.status||502);}
 }
 const positions=normalizePositions(rawPositions,instruments);
 // Separate permissions may apply to history. Preserve existing records if history fails.
 let dividends={items:[],nextCursor:null},dividendError=null;
 try{dividends=normalizeDividends(await get('/api/v0/equity/history/dividends?limit=50'),account.id,body.environment,account.currency);}catch(e){dividendError=e.message;}
 return {accountId:String(account.id),currency:account.currency,environment:body.environment,positions,investments:normalizeInvestments(account.investments),dividends,dividendError,syncedAt:new Date().toISOString()};
}

export async function brokerReachability(fetcher=fetch){
 const checks=await Promise.all(Object.entries(T212_ORIGINS).map(async([environment,origin])=>{try{const r=await fetcher(origin+'/api/v0/equity/account/summary',{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15000)});return {environment,reachable:r.status===401||r.status===200,status:r.status};}catch{return {environment,reachable:false,status:null};}}));
 return {checks,checkedAt:new Date().toISOString(),note:'Unauthenticated connectivity probe; HTTP 401 is expected and does not validate account credentials.'};
}

export function normalizeInvestments(i){const keys=['currentValue','totalCost','realizedProfitLoss','unrealizedProfitLoss'];return i&&keys.every(k=>typeof i[k]==='number'&&Number.isFinite(i[k]))&&i.currentValue>=0&&i.totalCost>=0?Object.fromEntries(keys.map(k=>[k,i[k]])):null;}
