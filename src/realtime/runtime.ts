import type { Server } from "socket.io";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { publishLocationSnapshot } from "@/src/realtime/services/location-publisher";
import {publishIncident} from "@/src/realtime/services/incident-publisher";

const runtime = globalThis as typeof globalThis & {
  __manecombRealtimeServer?: Server | null;
};

export function setRealtimeServer(io: Server | null) {
  runtime.__manecombRealtimeServer = io;
}

export function emitToOrganization(organizationId: string, event: string, payload: unknown) {
  runtime.__manecombRealtimeServer?.to("org:" + organizationId).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  runtime.__manecombRealtimeServer?.to("user:" + userId).emit(event, payload);
}
export function emitIncident(organizationId:string,driverId:string|null,event:string,payload:unknown){
  if(runtime.__manecombRealtimeServer)publishIncident(runtime.__manecombRealtimeServer,organizationId,driverId,event,payload);
}
export function emitLocationSnapshot(organizationId:string,snapshot:OperationalUnitSnapshot){
  if(runtime.__manecombRealtimeServer)publishLocationSnapshot(runtime.__manecombRealtimeServer,organizationId,snapshot);
}

export function disconnectUserSessions(userId: string) {
  const io = runtime.__manecombRealtimeServer;
  io?.to("user:" + userId).emit("session:revoked", { reason: "UNAUTHORIZED" });
  io?.in("user:" + userId).disconnectSockets(true);
}
export async function disconnectSessionSockets(userId:string,jti:string){
  const sockets=await runtime.__manecombRealtimeServer?.in("user:"+userId).fetchSockets();
  for(const socket of sockets||[]){
    if(socket.data?.session?.jti!==jti)continue;
    socket.emit("session:revoked",{reason:"UNAUTHORIZED"});socket.disconnect(true);
  }
}
