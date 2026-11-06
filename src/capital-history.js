// Accumulate dated cash flows before applying a display window. A missing
// transaction-day conversion makes subsequent cumulative totals unknown.
export function capitalHistory(points){let invested=0,dividends=0;return points.map(p=>{invested=invested!==null&&Number.isFinite(p.netFlow)?invested+p.netFlow:null;dividends=dividends!==null&&Number.isFinite(p.income)?dividends+p.income:null;return {...p,netInvested:invested,dividends};});}
