import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { hashDeviceToken } from "@/src/lib/device-session";
import { DeviceSession } from "@/src/core/models/DeviceSession";
import { Journey } from "@/src/core/models/Journey";
import { requireActiveSubscription } from "@/src/core/services/subscription-access";

const Input = z.object({
  vehicleId: z.string().min(1),
  journeyId: z.string().min(1)
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    await enforceRateLimit(request,"auth:device-session",{limit:12,windowSeconds:600,identity:session.sub});
    const input = Input.parse(await request.json());
    await connectDb();
    await requireActiveSubscription(session.organizationId);

    const journey = await Journey.findOne({
      _id: input.journeyId,
      organizationId: session.organizationId,
      driverId: session.sub,
      vehicleId: input.vehicleId,
      state: "RUNNING"
    }).select("_id");
    if (!journey) return NextResponse.json({ error: "RUNNING_JOURNEY_REQUIRED" }, { status: 409 });

    await DeviceSession.updateMany({
      organizationId: session.organizationId,
      userId: session.sub,
      journeyId: journey._id,
      revokedAt: null
    }, { $set: { revokedAt: new Date() } });

    const token = "mcdev_" + randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 14 * 60 * 60 * 1000);
    await DeviceSession.create({
      tokenHash: hashDeviceToken(token),
      organizationId: session.organizationId,
      userId: session.sub,
      vehicleId: input.vehicleId,
      journeyId: journey._id,
      expiresAt
    });

    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    return apiError(error);
  }
}
