export async function readBrokerBody(request,maxBytes=4096){
 if(Number(request.headers.get('content-length')||0)>maxBytes)throw Object.assign(Error('Request too large.'),{status:413});
 const reader=request.body?.getReader();if(!reader)throw Object.assign(Error('Invalid JSON.'),{status:400});
 const chunks=[];let total=0;try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw Object.assign(Error('Request too large.'),{status:413});}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Object.assign(Error('Invalid JSON.'),{status:400});}
}
export function brokerGuard(request,env={}){
 const url=new URL(request.url),loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.protocol!=='https:'&&!loopback)return {error:'HTTPS is required for broker credentials.',status:403};
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return {error:'Same-origin JSON request required.',status:403};
 // Sites dispatch supplies this trusted identity after authentication. Local mode
 // is explicitly enabled by the loopback-only development adapter.
 if(!request.headers.get('oai-authenticated-user-id')&&!(loopback&&env.ALLOW_LOCAL_BROKER==='true'))return {error:'Sign in before connecting a broker.',status:401};
 return null;
}
export function createBrokerLimiter(clock=Date.now){const users=new Map();return user=>{const now=clock(),last=users.get(user);if(last!==undefined&&now-last<10000)return false;if(users.size>=1000&&!users.has(user))users.delete(users.keys().next().value);users.set(user,now);return true;};}
