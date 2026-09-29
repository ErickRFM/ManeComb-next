import type { Server } from "socket.io";

let realtimeServer: Server | null = null;

export function setRealtimeServer(io: Server | null) {
  realtimeServer = io;
}

export function emitToOrganization(organizationId: string, event: string, payload: unknown) {
  realtimeServer?.to("org:" + organizationId).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  realtimeServer?.to("user:" + userId).emit(event, payload);
}
