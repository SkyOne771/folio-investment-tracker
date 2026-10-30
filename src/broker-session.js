// An in-flight result can only commit to the session that started it.
export function createBrokerSession(){let version=0,credentials=null;const active=new Set();return {
 get credentials(){return credentials;},get version(){return version;},
 connected(value,expected){if(expected!==version)return false;credentials={...value};return true;},
 current(expected){return expected===version;},
 track(controller){active.add(controller);return ()=>active.delete(controller);},
 clear(){version++;credentials=null;for(const c of active)c.abort();active.clear();}
};}
