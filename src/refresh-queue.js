// Coalesce overlapping refreshes without losing a changed portfolio snapshot.
export function createRefreshQueue(run){
 let active=null,pending=false;
 return function refresh(){
  pending=true;
  if(!active)active=(async()=>{try{do{pending=false;await run();}while(pending);}finally{active=null;}})();
  return active;
 };
}
