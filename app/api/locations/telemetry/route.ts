import { NextResponse } from "next/server";
import { TelemetrySchema, type DeviceDiagnostics } from "@/src/core/contracts/telemetry";
import { connectDb } from "@/src/lib/db";
import { requireApiSession } from "@/src/lib/auth";
import { requireDeviceTelemetrySession } from "@/src/lib/device-session";
import { apiError } from "@/src/lib/http";
import { recordTelemetry } from "@/src/core/services/telemetry";
import { requireActiveSubscription } from "@/src/core/services/subscription-access";
import { emitLocationSnapshot } from "@/src/realtime/runtime";
import { DeviceSession } from "@/src/core/models/DeviceSession";

export const runtime = "nodejs";

function diagnosticsFromInput(input:ReturnType<typeof TelemetrySchema.parse>,lastSeenAt:Date):DeviceDiagnostics|null{
  if(!input.client)return null;
  return {
    platform:input.client.platform??null,
    trackingVersion:input.client.trackingVersion??null,
    appVersionName:input.client.appVersionName??null,
    appVersionCode:input.client.appVersionCode??null,
    queueDepth:input.client.queueDepth??null,
    networkState:input.client.networkState??null,
    lastSeenAt:lastSeenAt.toISOString()
  };
}

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

      const seenAt=new Date();
      const diagnostics=diagnosticsFromInput(input,seenAt);
      const set:Record<string,unknown>={lastSeenAt:seenAt};
      if(diagnostics){
        set.lastDiagnostics={
          platform:diagnostics.platform,
          trackingVersion:diagnostics.trackingVersion,
          appVersionName:diagnostics.appVersionName,
          appVersionCode:diagnostics.appVersionCode,
          queueDepth:diagnostics.queueDepth,
          networkState:diagnostics.networkState
        };
        snapshot.deviceDiagnostics=diagnostics;
      }
      await DeviceSession.updateOne({_id:device.id,revokedAt:null},{$set:set});

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
