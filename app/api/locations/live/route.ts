import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { apiError } from "@/src/lib/http";
import { Vehicle } from "@/src/core/models/Vehicle";
import { DeviceSession } from "@/src/core/models/DeviceSession";
import { vehicleToSnapshot } from "@/src/core/services/telemetry";
import type { DeviceDiagnostics } from "@/src/core/contracts/telemetry";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = assertPermission(await requireApiSession(request, ["company_portal"]), "view_analytics");
    if (!session.organizationId) throw new Error("FORBIDDEN");
    await connectDb();

    const vehicles = await Vehicle.find({ organizationId: session.organizationId, status: { $ne: "archived" } }).lean();
    const vehicleIds=vehicles.map(vehicle=>vehicle._id);
    const deviceSessions=await DeviceSession.find({
      organizationId:session.organizationId,
      vehicleId:{$in:vehicleIds},
      revokedAt:null,
      expiresAt:{$gt:new Date()}
    }).sort({lastSeenAt:-1,updatedAt:-1}).lean();

    const latestByVehicle=new Map<string,DeviceDiagnostics>();
    for(const device of deviceSessions){
      const key=String(device.vehicleId);
      if(latestByVehicle.has(key))continue;
      latestByVehicle.set(key,{
        platform:device.lastDiagnostics?.platform??null,
        contractVersion:device.lastDiagnostics?.contractVersion??null,
        appVersionName:device.lastDiagnostics?.appVersionName??null,
        appVersionCode:device.lastDiagnostics?.appVersionCode??null,
        queueDepth:device.lastDiagnostics?.queueDepth??null,
        networkAvailable:device.lastDiagnostics?.networkAvailable??null,
        state:device.lastDiagnostics?.state??null,
        lastSeenAt:device.lastSeenAt?new Date(device.lastSeenAt).toISOString():null
      });
    }

    return NextResponse.json({
      units:vehicles.map(vehicle=>({
        ...vehicleToSnapshot(vehicle),
        deviceDiagnostics:latestByVehicle.get(String(vehicle._id))??null
      }))
    });
  } catch (error) { return apiError(error); }
}
