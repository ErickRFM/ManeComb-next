import type { Server, Socket } from "socket.io";

export function registerPresenceHandler(io: Server, socket: Socket) {
  const session = socket.data.session;
  if (session?.organizationId) {
    socket.join("org:" + session.organizationId);
    io.to("org:" + session.organizationId).emit("presence:update", { userId: session.sub, online: true });
  }
  socket.join("user:" + session.sub);

  socket.on("disconnect", () => {
    if (session?.organizationId) {
      io.to("org:" + session.organizationId).emit("presence:update", { userId: session.sub, online: false });
    }
  });
}
