import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const port=await new Promise((resolve,reject)=>{const probe=createServer();probe.on("error",reject);probe.listen(0,"127.0.0.1",()=>{const port=probe.address().port;probe.close(()=>resolve(port))})});
const baseUrl="http://127.0.0.1:"+port;
const env={...process.env,NODE_ENV:"development",PORT:String(port),HOSTNAME:"127.0.0.1",APP_URL:baseUrl,VISUAL_QA:"1",AUTH_SECRET:randomBytes(32).toString("hex"),MONGODB_URI:"",REDIS_URL:"",NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:"",VISUAL_QA_BASE_URL:baseUrl,...(process.argv.includes("--responsive")?{QA_RESPONSIVE:"1",QA_FILTER:"__responsive__"}:{})};
if(process.argv.includes("--mapbox")){if(!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.startsWith("pk."))throw new Error("Mapbox QA requires a configured public token");env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;env.QA_MAPBOX="1";env.QA_FILTER=process.env.QA_FILTER||"Mapbox provider"}
const server=spawn(process.execPath,["--import","tsx","server.ts"],{cwd:root,env,windowsHide:true,stdio:["ignore","pipe","pipe"]});
server.stdout.on("data",()=>{});server.stderr.on("data",()=>{});
try{
  let ready=false;const deadline=Date.now()+180_000;
  while(!ready&&server.exitCode===null&&Date.now()<deadline){try{ready=(await fetch(baseUrl+"/visual-qa/portal",{signal:AbortSignal.timeout(10_000)})).ok}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,500))}
  if(!ready)throw new Error("Visual fixture server did not become ready");
  const qa=spawn(process.execPath,[process.argv.includes("--functional")||process.argv.includes("--responsive")||process.argv.includes("--mapbox")?"scripts/functional-ui-qa.mjs":"scripts/visual-qa.mjs"],{cwd:root,env,windowsHide:true,stdio:"inherit"});
  process.exitCode=await new Promise(resolve=>{qa.on("error",()=>resolve(1));qa.on("exit",code=>resolve(code??1))});
}finally{
  if(server.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>server.kill("SIGKILL"),5000);server.once("close",()=>{clearTimeout(timer);resolve()});server.kill("SIGTERM")});
}
