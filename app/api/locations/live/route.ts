import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { apiError } from "@/src/lib/http";
import { Vehicle } from "@/src/core/models/Vehicle";
import { vehicleToSnapshot } from "@/src/core/services/telemetry";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const session = assertPermission(await requireApiSession(request, ["company_portal"]), "view_analytics");
    if (!session.organizationId) throw new Error("FORBIDDEN");
    await connectDb();
    const vehicles = await Vehicle.find({ organizationId: session.organizationId, status: { $ne: "archived" } }).lean();
    return NextResponse.json({ units: vehicles.map(vehicleToSnapshot) });
  } catch (error) { return apiError(error); }
}
