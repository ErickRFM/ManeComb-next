import type { Server, Socket } from "socket.io";
import { SocketTelemetrySchema } from "@/src/core/contracts/realtime";
import { allowSocketEvent } from "@/src/realtime/socket-rate-limit";
import { connectDb } from "@/src/lib/db";
import { recordTelemetry } from "@/src/core/services/telemetry";
import { requireActiveSubscription } from "@/src/core/services/subscription-access";

export function registerLocationHandler(io: Server, socket: Socket) {
  socket.on("location:update", async (payload, ack) => {
    try {
      if(!allowSocketEvent(socket,"location:update",40,60_000)) throw new Error("RATE_LIMITED");
      const session = socket.data.session;
      if (!session?.organizationId || session.channel !== "mobile_operations") throw new Error("FORBIDDEN");
      const input = SocketTelemetrySchema.parse(payload);
      await connectDb();
      await requireActiveSubscription(session.organizationId);
      const snapshot = await recordTelemetry(
        session.organizationId,
        { ...input, recordedAt: input.recordedAt || new Date() },
        { driverId: session.sub }
      );
      io.to("org:" + session.organizationId).emit("location:snapshot", snapshot);
      ack?.({ ok: true, snapshot });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "LOCATION_ERROR" });
    }
  });
}
