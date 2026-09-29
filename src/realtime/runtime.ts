import type { Server } from "socket.io";

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
