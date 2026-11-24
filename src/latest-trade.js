export function withLatestTrade(quote,feed,now=Date.now()){
 const tick=feed?.points?.at(-1);
 if(!quote||!tick||feed.stale||feed.currency!==quote.currency)return quote;
 if(!Number.isFinite(tick.close)||tick.close<=0||!Number.isFinite(tick.time)||tick.time>now+60000||now-tick.time>7*86400000)return quote;
 const quoteTime=Date.parse(quote.asOf);
 if(Number.isFinite(quoteTime)&&tick.time<=quoteTime)return quote;
 return {...quote,price:tick.close,asOf:new Date(tick.time).toISOString(),
  fetchedAt:feed.fetchedAt,stale:false,marketSession:tick.marketSession,source:'Yahoo Finance minute trade'};
}

// A quote refresh may finish after a newer minute request, or return the
// previous regular close while extended-hours trading is in progress.
export function retainNewerTrade(incoming,current){
 if(!current||current.currency!==incoming.currency||current.source==='Trading 212 position snapshot'||
  !(Date.parse(current.asOf)>Date.parse(incoming.asOf)))return incoming;
 return {...incoming,price:current.price,asOf:current.asOf,fetchedAt:current.fetchedAt,
  source:current.source,marketSession:current.marketSession,stale:current.stale};
}
