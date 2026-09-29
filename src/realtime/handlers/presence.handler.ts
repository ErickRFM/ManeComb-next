import type { Server, Socket } from "socket.io";
import { hasPermission } from "@/src/core/domain/permissions";
import { organizationRoom, rtcRoom, userRoom } from "@/src/realtime/rooms";

export function registerPresenceHandler(io: Server, socket: Socket) {
  const session = socket.data.session;
  const canUseRtc = Boolean(session?.organizationId && hasPermission(session.roles, "access_rtc"));

  if (session?.organizationId) {
    socket.join(organizationRoom(session.organizationId));
    if (canUseRtc) {
      socket.join(rtcRoom(session.organizationId));
      io.to(rtcRoom(session.organizationId)).emit("presence:update", { userId: session.sub, online: true });
    }
  }
  socket.join(userRoom(session.sub));

  socket.on("disconnect", () => {
    if (session?.organizationId && canUseRtc) {
      io.to(rtcRoom(session.organizationId)).emit("presence:update", { userId: session.sub, online: false });
    }
  });
}
