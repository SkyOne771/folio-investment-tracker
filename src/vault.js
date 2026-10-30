const error=(message,status)=>{throw Object.assign(Error(message),{status});};
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const base64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const encoder=new TextEncoder();
async function location(user){if(!user)error('Sign in to manage saved credentials.',401);const hash=await crypto.subtle.digest('SHA-256',encoder.encode(user));return 'broker-vault/t212/'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
async function key(env){try{const raw=bytes(env.BROKER_VAULT_KEY);if(raw.length!==32)throw Error();return await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}catch{error('Encrypted credential storage is not configured.',503);}}
function bucket(env){if(!env.BUCKET?.get||!env.BUCKET?.put)error('Encrypted credential storage is unavailable.',503);return env.BUCKET;}
export async function vaultStatus(env,user){const store=bucket(env);await key(env);const object=await store.get(await location(user));if(!object)return {available:true,saved:false,revision:null};const data=await object.json();return {available:true,saved:!data.forgotten,revision:object.etag,environment:data.forgotten?null:data.environment};}
export async function saveCredentials(env,user,credentials,revision){
 if(!['live','demo'].includes(credentials.environment)||typeof credentials.apiKey!=='string'||typeof credentials.apiSecret!=='string'||!credentials.apiKey||!credentials.apiSecret||credentials.apiKey.length>512||credentials.apiSecret.length>512||/[:\s\x00-\x1f]/.test(credentials.apiKey)||/[^\x21-\x7e]/.test(credentials.apiSecret))error('Enter a valid API key, API secret and environment.',400);
 const store=bucket(env),path=await location(user),iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(user+'|trading212|v1')},await key(env),encoder.encode(JSON.stringify({apiKey:credentials.apiKey,apiSecret:credentials.apiSecret,environment:credentials.environment})));
 const object=await store.put(path,JSON.stringify({version:1,iv:base64(iv),ciphertext:base64(cipher),environment:credentials.environment}),{onlyIf:revision?{etagMatches:revision}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
 if(!object)error('Connection changed while saving. Refresh Connections before trying again.',409);
 return {available:true,saved:true,environment:credentials.environment,revision:object.etag};
}
export async function loadCredentials(env,user){const object=await bucket(env).get(await location(user));if(!object)error('No saved Trading 212 connection. Enter your credentials once.',404);const record=await object.json();if(record.forgotten)error('The saved connection was forgotten. Enter your credentials to reconnect.',404);try{const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(record.iv),additionalData:encoder.encode(user+'|trading212|v1')},await key(env),bytes(record.ciphertext));return JSON.parse(new TextDecoder().decode(raw));}catch{error('Saved credentials could not be decrypted. Forget the connection and save it again.',503);}}
export async function forgetCredentials(env,user){const object=await bucket(env).put(await location(user),JSON.stringify({forgotten:true,nonce:crypto.randomUUID()}));return {available:true,saved:false,revision:object.etag};}
