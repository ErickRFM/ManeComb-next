import type { Server } from "socket.io";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { publishLocationSnapshot } from "@/src/realtime/services/location-publisher";

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
export function emitLocationSnapshot(organizationId:string,snapshot:OperationalUnitSnapshot){
  if(runtime.__manecombRealtimeServer)publishLocationSnapshot(runtime.__manecombRealtimeServer,organizationId,snapshot);
}

export function disconnectUserSessions(userId: string) {
  const io = runtime.__manecombRealtimeServer;
  io?.to("user:" + userId).emit("session:revoked", { reason: "UNAUTHORIZED" });
  io?.in("user:" + userId).disconnectSockets(true);
}
