import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { requireApiSession } from "@/src/lib/auth";
import { apiError } from "@/src/lib/http";
import { Vehicle } from "@/src/core/models/Vehicle";
import { vehicleToSnapshot } from "@/src/core/services/telemetry";
import { assertAnyPermission } from "@/src/core/domain/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    assertAnyPermission(session.roles, ["manage_vehicles","view_analytics"]);
    await connectDb();
    const vehicles = await Vehicle.find({ organizationId: session.organizationId, status: { $ne: "archived" } }).lean();
    return NextResponse.json({ units: vehicles.map(vehicleToSnapshot) });
  } catch (error) { return apiError(error); }
}
