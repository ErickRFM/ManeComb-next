import { createHash } from "node:crypto";
import { connectDb } from "@/src/lib/db";
import { DeviceSession } from "@/src/core/models/DeviceSession";
import { User } from "@/src/core/models/User";
import { Journey } from "@/src/core/models/Journey";
import { Vehicle } from "@/src/core/models/Vehicle";

export function hashDeviceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireDeviceTelemetrySession(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer mcdev_")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice(7).trim();
  await connectDb();

  const session = await DeviceSession.findOne({
    tokenHash: hashDeviceToken(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!session) throw new Error("UNAUTHORIZED");

  const [user,journey,vehicle] = await Promise.all([User.exists({
    _id: session.userId,
    organizationId: session.organizationId,
    channel: "mobile_operations",
    active: true
  }), Journey.exists({_id:session.journeyId,organizationId:session.organizationId,driverId:session.userId,vehicleId:session.vehicleId,state:"RUNNING"}),
  Vehicle.exists({_id:session.vehicleId,organizationId:session.organizationId,driverId:session.userId})]);
  if (!user || !journey || !vehicle) {
    await DeviceSession.updateOne({_id:session._id,revokedAt:null},{$set:{revokedAt:new Date()}});
    throw new Error("UNAUTHORIZED");
  }

  return {
    id: String(session._id),
    organizationId: String(session.organizationId),
    userId: String(session.userId),
    vehicleId: String(session.vehicleId),
    journeyId: String(session.journeyId)
  };
}
