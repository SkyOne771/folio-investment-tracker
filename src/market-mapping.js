// Explicit provider aliases: broker IDs are not exchange ticker symbols.
// Invesco EQQQ USD listing is EQQU LN; the GBP listing is EQQQ LN.
// https://www.invesco.com/uk/en/financial-products/etfs/invesco-eqqq-nasdaq-100-ucits-etf-dist.html
const aliases={SGLNL_EQ:'SGLN.L',EQQQS_EQ:'EQQU.L',VDEML_EQ:'VDEM.L',NATOL_EQ:'NATO.L',GAWL_EQ:'GAW.L',SSLNL_EQ:'SSLN.L',XSX7D_EQ:'XSX7.DE',SPY5L_EQ:'SPY5.L',EUDFD_EQ:'EUDF.DE',DFNXL_EQ:'DFNX.L',DFSVD_EQ:'DFSV.DE'};
// Issuer-identified share classes, with listings in the instrument's currency.
// https://www.blackrock.com/ae/intermediaries/products/334464/ishares-global-aerospace-defence-ucits-etf
const isinListings={IE000U9ODG19:{EUR:'5J50.DE',GBP:'DFND.L',USD:'DFND.SW'},IE000YYE6WK5:{EUR:'DFEN.DE',USD:'DFNS.L'},IE000BRM9046:{GBP:'DFNX.L',USD:'IDFN.L',EUR:'IVDF.DE'},IE0032077012:{GBP:'EQQQ.L',USD:'EQQU.L',EUR:'EQQQ.DE'}};
export function marketSymbol(ticker,instrument={}){
 const key=String(ticker||'').toUpperCase();
 if(key==='HCN_US_EQ')return 'WELL';
 const listing=isinListings[instrument.isin]?.[instrument.currency];if(listing)return listing;
 if(aliases[key])return aliases[key];
 return /^[A-Z0-9]+_US_EQ$/.test(key)?key.replace(/_US_EQ$/,''):'';
}
export function quoteFailure(previous,error){if(previous?.source==='Trading 212 position snapshot')return {...previous,enrichmentError:'Market history unavailable; broker price retained. Review the market-data symbol mapping.'};return previous?{...previous,stale:true}:null;}
