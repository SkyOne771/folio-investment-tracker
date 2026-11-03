// Search by exact ISIN, never by an ambiguous company name or ticker alone.
// Yahoo supports ISIN searches: https://help.yahoo.com/kb/SLN2340.html
export async function resolveHistoryListing(isin,currency,search,history,rates){
 if(!/^[A-Z0-9]{12}$/.test(isin)||!['USD','EUR','GBP','PLN','CHF','CAD','JPY','AUD','SEK','DKK'].includes(currency))throw Error('Invalid instrument identity or currency.');
 const results=await search(isin),candidates=[...new Set((results.quotes||[]).filter(q=>['EQUITY','ETF'].includes(q.quoteType)&&q.isYahooFinance!==false&&/^[A-Z0-9][A-Z0-9.^=\-]{0,24}$/.test(q.symbol||'')).map(q=>q.symbol))].slice(0,8);
 const alternates=[];
 for(const symbol of candidates){try{const result=await history(symbol);if(result.currency===currency&&result.history?.length)return {...result,resolvedSymbol:symbol,resolvedIsin:isin,resolution:'Exact ISIN search; matching quote currency. May use another listing of the same share class.'};if(result.history?.length)alternates.push({...result,resolvedSymbol:symbol});}catch{/* A delisted or unavailable listing must not block other exact-ISIN results. */}}
 for(const result of alternates){if(!rates)break;try{const rows=(await rates(result.currency)).filter(r=>r.base===currency&&r.quote===result.currency&&r.rate>0).sort((a,b)=>a.date.localeCompare(b.date));let i=0,rate=null;const converted=result.history.map(p=>{while(i<rows.length&&rows[i].date<=p.date)rate=rows[i++];return rate&&Date.parse(p.date)-Date.parse(rate.date)<=7*86400000?{date:p.date,close:p.close/rate.rate}:null;}).filter(Boolean);if(converted.length)return {...result,currency,history:converted,resolvedIsin:isin,resolvedCurrency:result.currency,resolution:'Same ISIN on an alternate listing, translated using dated daily reference FX; not the original venue close.'};}catch{/* Missing FX cannot be replaced by current rates. */}}
 throw Error('No historical listing verified for this ISIN and trading currency. Review its market symbol.');
}
