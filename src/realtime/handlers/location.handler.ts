import type { Server, Socket } from "socket.io";
import { SocketTelemetrySchema } from "@/src/core/contracts/realtime";
import { connectDb } from "@/src/lib/db";
import { recordTelemetry } from "@/src/core/services/telemetry";

export function registerLocationHandler(io: Server, socket: Socket) {
  socket.on("location:update", async (payload, ack) => {
    try {
      const session = socket.data.session;
      if (!session?.organizationId) throw new Error("FORBIDDEN");
      const input = SocketTelemetrySchema.parse(payload);
      await connectDb();
      const snapshot = await recordTelemetry(session.organizationId, {
        ...input,
        recordedAt: input.recordedAt || new Date()
      });
      io.to("org:" + session.organizationId).emit("location:snapshot", snapshot);
      ack?.({ ok: true, snapshot });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "LOCATION_ERROR" });
    }
  });
}
