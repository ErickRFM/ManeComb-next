import { NextResponse } from "next/server";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";
import { connectDb } from "@/src/lib/db";
import { requireApiSession } from "@/src/lib/auth";
import { apiError } from "@/src/lib/http";
import { recordTelemetry } from "@/src/core/services/telemetry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const input = TelemetrySchema.parse(await request.json());
    await connectDb();
    const snapshot = await recordTelemetry(session.organizationId, input, { driverId: session.sub });
    return NextResponse.json({ snapshot });
  } catch (error) { return apiError(error); }
}
