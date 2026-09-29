import type { Server as HttpServer } from "node:http";
import { parse } from "cookie";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { ensureRedis } from "@/src/lib/redis";
import { assertStoredSessionActive, requireRealtimeSession } from "@/src/lib/auth";
import { setGauge } from "@/src/lib/metrics";
import { registerLocationHandler } from "@/src/realtime/handlers/location.handler";
import { registerChatHandler } from "@/src/realtime/handlers/chat.handler";
import { registerRadioHandler } from "@/src/realtime/handlers/radio.handler";
import { registerRtcHandler } from "@/src/realtime/handlers/rtc.handler";
import { registerPresenceHandler } from "@/src/realtime/handlers/presence.handler";
import { setRealtimeServer } from "@/src/realtime/runtime";

const SESSION_RECHECK_MS = 30_000;

export async function createRealtimeServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1024 * 1024
  });

  const redis = await ensureRedis().catch(() => null);
  if (redis) {
    const subscriber = redis.duplicate();
    if (subscriber.status === "wait") await subscriber.connect();
    io.adapter(createAdapter(redis, subscriber));
  }

  io.use(async (socket, next) => {
    try {
      const cookies = parse(socket.handshake.headers.cookie || "");
      const token = String(socket.handshake.auth?.token || cookies.manecomb_session || "");
      if (!token) return next(new Error("UNAUTHORIZED"));
      socket.data.session = await requireRealtimeSession(token);
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    setGauge("socket_connections", io.engine.clientsCount);

    const watchdog = setInterval(() => {
      void assertStoredSessionActive(socket.data.session).catch(() => {
        socket.emit("session:revoked", { reason: "UNAUTHORIZED" });
        socket.disconnect(true);
      });
    }, SESSION_RECHECK_MS);
    watchdog.unref?.();

    registerPresenceHandler(io, socket);
    registerLocationHandler(io, socket);
    registerChatHandler(io, socket);
    registerRadioHandler(io, socket);
    registerRtcHandler(io, socket);

    socket.on("disconnect", () => {
      clearInterval(watchdog);
      queueMicrotask(() => setGauge("socket_connections", io.engine.clientsCount));
    });
  });

  setRealtimeServer(io);
  io.on("close", () => {
    setGauge("socket_connections", 0);
    setRealtimeServer(null);
  });
  return io;
}
