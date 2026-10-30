import http from 'node:http';
import {Readable} from 'node:stream';
import worker from '../dist/server/index.js';
const port=Number(process.env.PORT||5173);
http.createServer(async(req,res)=>{try{
 const host=req.headers.host;
 if(![`localhost:${port}`,`127.0.0.1:${port}`,`[::1]:${port}`].includes(host)){res.writeHead(403);res.end('Invalid host');return;}
 const init={method:req.method,headers:req.headers};
 if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}
 const r=await worker.fetch(new Request(`http://${host}${req.url}`,init),{...process.env,ALLOW_LOCAL_BROKER:'true'},{});
 res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Server error');console.error('Local request failed');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
