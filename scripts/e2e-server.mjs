// Loopback-only E2E environment. No real broker requests or durable vault writes.
import http from 'node:http';
import {Readable} from 'node:stream';
import worker from '../dist/server/index.js';
const port=Number(process.env.PORT||5230),objects=new Map();let revision=0;
let config={brokerStatus:200,marketOutage:false,historyDelay:0},brokerCalls=[];
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,init={})=>{
 const url=new URL(typeof input==='string'?input:input.url);
 if(['live.trading212.com','demo.trading212.com'].includes(url.hostname)){
  brokerCalls.push({method:init.method||'GET',path:url.pathname});
  if(config.brokerStatus!==200)return Response.json({error:'Fixture broker failure'},{status:config.brokerStatus});
  if(new Headers(init.headers).get('Authorization')!=='Basic '+btoa('e2e-key:e2e-secret'))return Response.json({error:'Fixture credentials rejected'},{status:401});
  if(url.pathname.endsWith('/account/summary'))return Response.json({id:12345,currency:'USD',investments:{currentValue:400,totalCost:350,realizedProfitLoss:10,unrealizedProfitLoss:50}});
  if(url.pathname.endsWith('/positions'))return Response.json([
   {instrument:{ticker:'AAPL_US_EQ',name:'Apple',currency:'USD',isin:'US0378331005'},quantity:2,averagePricePaid:100,currentPrice:110},
   {instrument:{ticker:'EQQQs_EQ',name:'Invesco EQQQ Nasdaq-100',currency:'USD',isin:'IE0032077012'},quantity:1,averagePricePaid:100,currentPrice:120},
   {instrument:{ticker:'SGLNl_EQ',name:'iShares Physical Gold',currency:'GBP'},quantity:1,averagePricePaid:50,currentPrice:60}
  ]);
  if(url.pathname.endsWith('/history/dividends')){const older=url.searchParams.has('cursor');return Response.json({items:[{ticker:'AAPL_US_EQ',reference:older?'fixture-old':'fixture-new',amount:older?2:3,currency:'USD',paidOn:older?'2026-08-15T12:00:00Z':'2026-10-15T12:00:00Z'}],nextPagePath:older?null:'/api/v0/equity/history/dividends?cursor=fixture-next'});}
  return Response.json({error:'Unexpected broker fixture endpoint'},{status:500});
 }
 if(url.hostname.endsWith('trading212.com'))return Response.json({error:'Unrecognised broker fixture host'},{status:500});
 if(url.hostname.endsWith('finance.yahoo.com')){
  if(config.marketOutage)return Response.json({error:'Fixture market outage'},{status:503});
  if(config.historyDelay&&url.searchParams.get('interval')==='1d'&&url.searchParams.has('period1'))await new Promise(r=>setTimeout(r,config.historyDelay));
 }
 return realFetch(input,init);
};
const env={ALLOW_LOCAL_BROKER:'true',BROKER_VAULT_KEY:btoa('E'.repeat(32)),BUCKET:{
 async get(path){const object=objects.get(path);return object?{etag:object.etag,json:async()=>JSON.parse(object.value)}:null;},
 async put(path,value,options={}){const old=objects.get(path);if(options.onlyIf?.etagMatches&&options.onlyIf.etagMatches!==old?.etag)return null;if(options.onlyIf?.etagDoesNotMatch==='*'&&old)return null;const object={value,etag:String(++revision)};objects.set(path,object);return object;}
}};
http.createServer(async(req,res)=>{try{
 if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host)){res.writeHead(403).end();return;}
 if(req.url==='/__test/control'&&req.method==='POST'){let body='';for await(const part of req)body+=part;const next=JSON.parse(body);config={...config,...next};res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({ok:true}));return;}
 if(req.url==='/__test/state'){const raw=JSON.stringify([...objects.values()]);res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({brokerCalls,vaultObjects:objects.size,vaultContainsPlaintext:raw.includes('e2e-key')||raw.includes('e2e-secret'),vaultForgotten:[...objects.values()].every(o=>JSON.parse(o.value).forgotten)}));return;}
 const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-e2e-user');
 const init={method:req.method,headers};if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}
 const response=await worker.fetch(new Request(`http://${req.headers.host}${req.url}`,init),env);
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500).end('E2E server error');}
}).listen(port,'127.0.0.1',()=>console.log(`E2E fixtures only: http://localhost:${port}\nBroker credentials: e2e-key / e2e-secret (dummy, never forwarded)`));
