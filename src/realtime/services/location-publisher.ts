import type { Server } from "socket.io";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { incrementMetric } from "@/src/lib/metrics";
type Entry={organizationId:string;latest:number;pending:OperationalUnitSnapshot|null;touched:number};
type Publisher={publish:(organizationId:string,snapshot:OperationalUnitSnapshot)=>void};
const runtime=globalThis as typeof globalThis & {__manecombLocationPublishers?:WeakMap<Server,Publisher>};
const publishers=runtime.__manecombLocationPublishers||(runtime.__manecombLocationPublishers=new WeakMap());

function createPublisher(io:Server):Publisher{
  const entries=new Map<string,Entry>();let closed=false;
  const timer=setInterval(()=>{
    for(const [key,entry] of entries){
      if(entry.pending){
        const snapshot=entry.pending;entry.pending=null;
        let recipients=io.to("org:"+entry.organizationId+":monitor");
        if(snapshot.driverId)recipients=recipients.to("user:"+snapshot.driverId);
        recipients.emit("location:snapshot",snapshot);
        incrementMetric("location_snapshots_published_total");
      }
      if(Date.now()-entry.touched>300_000)entries.delete(key);
    }
  },250);timer.unref?.();
  io.once("close",()=>{closed=true;clearInterval(timer);entries.clear();publishers.delete(io)});
  return {publish:(organizationId,snapshot)=>{
    if(closed)return;
    const key=organizationId+":"+snapshot.vehicleId;
    const recordedAt=snapshot.recordedAt?Date.parse(snapshot.recordedAt):0;
    const existing=entries.get(key);
    if(existing&&recordedAt<existing.latest){incrementMetric("location_snapshots_obsolete_total");return}
    if(existing?.pending)incrementMetric("location_snapshots_coalesced_total");
    entries.set(key,{organizationId,latest:recordedAt,pending:snapshot,touched:Date.now()});
  }};
}
export function publishLocationSnapshot(io:Server,organizationId:string,snapshot:OperationalUnitSnapshot){
  let publisher=publishers.get(io);
  if(!publisher){publisher=createPublisher(io);publishers.set(io,publisher)}
  publisher.publish(organizationId,snapshot);
}
