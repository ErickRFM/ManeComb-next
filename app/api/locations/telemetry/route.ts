import { NextResponse } from "next/server";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";
import { connectDb } from "@/src/lib/db";
import { requireApiSession } from "@/src/lib/auth";
import { requireDeviceTelemetrySession } from "@/src/lib/device-session";
import { apiError } from "@/src/lib/http";
import { recordTelemetry } from "@/src/core/services/telemetry";
import { requireActiveSubscription } from "@/src/core/services/subscription-access";
import { emitLocationSnapshot } from "@/src/realtime/runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = TelemetrySchema.parse(await request.json());
    await connectDb();

    const authorization = request.headers.get("authorization") || "";
    if (authorization.startsWith("Bearer mcdev_")) {
      const device = await requireDeviceTelemetrySession(request);
      if (input.vehicleId !== device.vehicleId || input.journeyId !== device.journeyId) throw new Error("FORBIDDEN");
      await requireActiveSubscription(device.organizationId);
      const snapshot = await recordTelemetry(device.organizationId, input, { driverId: device.userId });
      emitLocationSnapshot(device.organizationId,snapshot);
      return NextResponse.json({ snapshot, packetId: input.packetId || null });
    }

    const session = await requireApiSession(request, ["mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    await requireActiveSubscription(session.organizationId);
    const snapshot = await recordTelemetry(session.organizationId, input, { driverId: session.sub });
    emitLocationSnapshot(session.organizationId,snapshot);
    return NextResponse.json({ snapshot, packetId: input.packetId || null });
  } catch (error) { return apiError(error); }
}
