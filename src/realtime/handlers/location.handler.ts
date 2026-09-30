import type { Server, Socket } from "socket.io";
import { SocketTelemetrySchema } from "@/src/core/contracts/realtime";
import { allowSocketEvent } from "@/src/realtime/socket-rate-limit";
import { connectDb } from "@/src/lib/db";
import { recordTelemetry } from "@/src/core/services/telemetry";
import { requireActiveSubscription } from "@/src/core/services/subscription-access";
import { incrementMetric, observeDuration, setGauge } from "@/src/lib/metrics";

let inFlight=0;

export function registerLocationHandler(io: Server, socket: Socket) {
  socket.on("location:update", async (payload, ack) => {
    const started=performance.now();
    inFlight++;setGauge("telemetry_in_flight",inFlight);
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
      incrementMetric("telemetry_ack_total",1,{status:"ok"});
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "LOCATION_ERROR" });
      incrementMetric("telemetry_ack_total",1,{status:"error"});
    } finally {
      inFlight--;setGauge("telemetry_in_flight",inFlight);
      observeDuration("telemetry_handler_ms",performance.now()-started);
    }
  });
}
