import { createHash } from "node:crypto";
import { connectDb } from "@/src/lib/db";
import { DeviceSession } from "@/src/core/models/DeviceSession";

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
  return {
    id: String(session._id),
    organizationId: String(session.organizationId),
    userId: String(session.userId),
    vehicleId: String(session.vehicleId),
    journeyId: String(session.journeyId)
  };
}
