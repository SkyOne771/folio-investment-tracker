import {vaultStatus,saveCredentials,loadCredentials,forgetCredentials} from './vault.js';
import {readBrokerBody,brokerGuard,createBrokerLimiter} from './security.js';
import {trading212,brokerReachability} from './brokers.js';
import {page,client,coreSource,style} from '../worker/assets.js';
const allowBroker=createBrokerLimiter();
const cache=new Map(),pending=new Map();
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store, private','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}});
async function cached(key,ttl,fn){const old=cache.get(key);if(old&&Date.now()-old.at<ttl)return {...old.data,cached:true};if(pending.has(key))return pending.get(key);const p=(async()=>{try{const data=await fn();if(cache.size>300)cache.delete(cache.keys().next().value);cache.set(key,{data,at:Date.now()});return data;}catch(e){if(old)return {...old.data,stale:true,error:e.message};throw e;}finally{pending.delete(key);}})();pending.set(key,p);return p;}
async function upstream(url){const r=await fetch(url,{headers:{'User-Agent':'InvestmentTracker/1.0 (personal portfolio)'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(`Data provider returned HTTP ${r.status}`);return r.json();}
export async function quote(symbol,env={}){
 return cached(`quote:${symbol}:${env.FINNHUB_API_KEY?'fh':'yh'}`,60000,async()=>{
  const data=await upstream(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&events=div%2Csplits`);const c=data.chart?.result?.[0],m=c?.meta;
  if(!m||!Number.isFinite(m.regularMarketPrice)||!m.currency||!m.regularMarketTime)throw Error('Price or currency unavailable for this ticker.');
  const scale=m.currency==='GBp'?0.01:1;
  const q={symbol,name:m.longName||m.shortName||symbol,currency:m.currency==='GBp'?'GBP':m.currency,price:m.regularMarketPrice*scale,previousClose:(m.chartPreviousClose??m.previousClose??0)*scale,asOf:new Date(m.regularMarketTime*1000).toISOString(),fetchedAt:new Date().toISOString(),source:'Yahoo Finance (unofficial)',freshness:'Provider quote; may be delayed',dividends:Object.values(c.events?.dividends||{}).map(d=>({date:new Date(d.date*1000).toISOString().slice(0,10),amount:d.amount*scale})),splits:Object.values(c.events?.splits||{}),history:(c.timestamp||[]).map((t,i)=>({date:new Date(t*1000).toISOString().slice(0,10),close:c.indicators?.quote?.[0]?.close?.[i]*scale})).filter(x=>Number.isFinite(x.close)&&x.close>0)};
  if(env.FINNHUB_API_KEY&&/^[A-Z.]+$/.test(symbol)&&q.currency==='USD'){try{const f=await upstream(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(env.FINNHUB_API_KEY)}`);if(f.c>0&&f.t>0){q.price=f.c;q.asOf=new Date(f.t*1000).toISOString();q.source='Finnhub quote · Yahoo dividends';q.freshness='Latest available Finnhub quote';}}catch{q.warning='Finnhub unavailable; using Yahoo quote';}}
  return q;
 });
}
export async function intradayQuote(symbol){return cached(`intraday:${symbol}`,60000,async()=>{
 const providerSymbol=({FB:'META',PBRA:'PBR-A',BRKB:'BRK-B'})[symbol]||symbol;
 const data=await upstream(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?range=1d&interval=1m`),c=data.chart?.result?.[0],m=c?.meta;
 if(!m?.currency||!c.timestamp?.length)throw Error('Minute prices unavailable for this instrument.');
 const scale=m.currency==='GBp'?0.01:1,points=c.timestamp.map((t,i)=>({time:t*1000,close:c.indicators?.quote?.[0]?.close?.[i]*scale})).filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.close)&&p.close>0);
 if(!points.length)throw Error('No usable minute prices for this session.');
 return {symbol,currency:m.currency==='GBp'?'GBP':m.currency,previousClose:m.chartPreviousClose*scale,points,fetchedAt:new Date().toISOString(),source:'Yahoo Finance · 1-minute intervals · may be delayed'};
 });}
export async function fxRates(base){return cached(`fx:${base}`,3600000,async()=>{const rows=await upstream(`https://api.frankfurter.dev/v2/rates?base=${base}&quotes=USD,EUR,GBP,PLN,CHF,CAD,JPY,AUD,SEK,DKK`);if(!Array.isArray(rows)||!rows.length||rows.some(r=>!Number.isFinite(r.rate)||r.rate<=0))throw Error('Invalid FX response');return {base,date:rows[0].date,rates:Object.fromEntries([[base,1],...rows.map(r=>[r.quote,r.rate])]),source:'Frankfurter daily reference rates'};});}
export async function priceHistory(symbol,start){return cached(`history:${symbol}:${start}`,6*3600000,async()=>{
 // Provider spellings for the same share class; FB became META on 2022-06-09.
 // https://investor.atmeta.com/investor-news/press-release-details/2022/Meta-Platforms-Inc.-to-Change-Ticker-Symbol-to-META-on-June-9/default.aspx
 const providerSymbol=({FB:'META',PBRA:'PBR-A',BRKB:'BRK-B'})[symbol]||symbol;
 const begin=Math.floor(Date.parse(start)/1000)-7*86400,end=Math.floor(Date.now()/1000)+86400;
 const data=await upstream(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?period1=${begin}&period2=${end}&interval=1d&events=splits`);
 const c=data.chart?.result?.[0],m=c?.meta;if(!m?.currency||!c.timestamp?.length)throw Error('Historical prices unavailable for this ticker.');
 const scale=m.currency==='GBp'?0.01:1;
 return {symbol,currency:m.currency==='GBp'?'GBP':m.currency,history:c.timestamp.map((t,i)=>({date:new Date(t*1000).toISOString().slice(0,10),close:c.indicators?.quote?.[0]?.close?.[i]*scale})).filter(p=>p.close>0&&Number.isFinite(p.close)),splits:Object.values(c.events?.splits||{}),source:'Yahoo Finance daily close'};
 });}
export async function historicalFx(base,start,currencies){return cached(`fx-history:${base}:${start}:${currencies}`,6*3600000,async()=>{
 if(!currencies.length)return {rows:[]};const from=new Date(Date.parse(start)-7*86400000).toISOString().slice(0,10);
 const rows=await upstream(`https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${currencies.join(',')}&from=${from}&to=${new Date().toISOString().slice(0,10)}`);
 if(!Array.isArray(rows)||!rows.length||rows.some(r=>!Number.isFinite(r.rate)||r.rate<=0))throw Error('Historical FX unavailable');return {rows,source:'Frankfurter daily reference rates'};
 });}
function historyStart(url){const start=url.searchParams.get('start')||'';if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start))||new Date(start).toISOString().slice(0,10)!==start||start<'1999-01-01'||start>new Date().toISOString().slice(0,10))throw Object.assign(Error('Invalid history start date'),{status:400});return start;}
export default {async fetch(request,env={}){const url=new URL(request.url);try{
 if(url.pathname==='/api/brokers/trading212'&&request.method==='POST'){
  const denied=brokerGuard(request,env);if(denied)return json({error:denied.error},denied.status);
  const body=await readBrokerBody(request);
  const identity=request.headers.get('oai-authenticated-user-id')||'local';
  const user=request.headers.get('oai-authenticated-user-id');
  if(body?.action==='connection-status'&&!user)return json({available:false,saved:false});
  if(['remember','forget'].includes(body?.action)&&!user)return json({error:'Sign in to use saved connections.'},401);
  if(body?.action==='connection-status'){try{return json(await vaultStatus(env,user));}catch(e){if(e.status===503)return json({available:false,saved:false});throw e;}}
  if(body?.action==='remember')return json(await saveCredentials(env,user,body,body.revision));
  if(body?.action==='forget')return json(await forgetCredentials(env,user));
  let brokerBody=body;
  if(body?.useSaved){if(!user)return json({error:'Sign in to use saved connections.'},401);brokerBody={...body,...await loadCredentials(env,user)};}
  if(!allowBroker(identity))return json({error:'Wait 10 seconds between broker requests.'},429);
  return json(await trading212(brokerBody));
 }
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(url.pathname==='/api/health/brokers')return json(await brokerReachability());
 if(url.pathname==='/api/health')return json({status:'ok',version:'1.0.0',time:new Date().toISOString(),credentialVaultReady:!!env.BROKER_VAULT_KEY&&!!env.BUCKET?.get});
 if(url.pathname==='/api/intraday'){const symbol=(url.searchParams.get('symbol')||'').toUpperCase();if(!/^[A-Z0-9^][A-Z0-9.^=\-]{0,24}$/.test(symbol))return json({error:'Invalid symbol'},400);return json(await intradayQuote(symbol));}
 if(url.pathname==='/api/history'){const symbol=(url.searchParams.get('symbol')||'').toUpperCase();if(!/^[A-Z0-9^][A-Z0-9.^=\-]{0,24}$/.test(symbol))return json({error:'Invalid symbol'},400);return json(await priceHistory(symbol,historyStart(url)));}
 if(url.pathname==='/api/fx/history'){const base=url.searchParams.get('base')||'PLN',currencies=[...new Set((url.searchParams.get('currencies')||'').split(',').filter(Boolean))].sort();const allowed=['USD','EUR','GBP','PLN','CHF','CAD','JPY','AUD','SEK','DKK'];if(!allowed.includes(base)||currencies.some(c=>!allowed.includes(c)))return json({error:'Unsupported currency'},400);return json(await historicalFx(base,historyStart(url),currencies.filter(c=>c!==base)));}
 if(url.pathname==='/api/quote'){const symbol=(url.searchParams.get('symbol')||'').toUpperCase();if(!/^[A-Z0-9^][A-Z0-9.^=\-]{0,24}$/.test(symbol))return json({error:'Invalid symbol'},400);return json(await quote(symbol,env));}
 if(url.pathname==='/api/fx'){const base=url.searchParams.get('base')||'PLN';if(!['USD','EUR','GBP','PLN','CHF','CAD','JPY','AUD','SEK','DKK'].includes(base))return json({error:'Unsupported currency'},400);return json(await fxRates(base));}
 const assets={'/':[page,'text/html; charset=utf-8'],'/client.js':[client,'text/javascript'],'/core.js':[coreSource,'text/javascript'],'/style.css':[style,'text/css']};
 const asset=assets[url.pathname];if(!asset)return json({error:'Not found'},404);
 return new Response(asset[0],{headers:{'content-type':asset[1],'cache-control':'no-store','permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'self'"}});
 }catch(e){return json({error:e.message},e.status||502);}}};
