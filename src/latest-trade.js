export function withLatestTrade(quote,feed,now=Date.now()){
 const tick=feed?.points?.at(-1);
 if(!quote||!tick||feed.stale||feed.currency!==quote.currency)return quote;
 if(!Number.isFinite(tick.close)||tick.close<=0||!Number.isFinite(tick.time)||tick.time>now+60000||now-tick.time>7*86400000)return quote;
 const quoteTime=Date.parse(quote.asOf);
 if(Number.isFinite(quoteTime)&&tick.time<=quoteTime)return quote;
 return {...quote,price:tick.close,asOf:new Date(tick.time).toISOString(),
  fetchedAt:feed.fetchedAt,stale:false,marketSession:tick.marketSession,source:'Yahoo Finance minute trade'};
}
