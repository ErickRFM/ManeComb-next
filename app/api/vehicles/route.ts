import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Vehicle } from "@/src/core/models/Vehicle";
import { writeAudit } from "@/src/core/services/audit";

const VehicleInput = z.object({
  economicNumber: z.string().min(1).max(40),
  plates: z.string().max(30).optional(),
  model: z.string().max(80).optional(),
  capacity: z.number().int().min(1).max(100).optional()
});
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal"]);
    await connectDb();
    const vehicles = await Vehicle.find({ organizationId: session.organizationId }).sort({ economicNumber: 1 }).lean();
    return NextResponse.json({ vehicles });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const input = VehicleInput.parse(await request.json());
    await connectDb();
    const vehicle = await Vehicle.create({ organizationId: session.organizationId, ...input });
    await writeAudit({ organizationId: session.organizationId, actorUserId: session.sub, action: "vehicle.create", entityType: "Vehicle", entityId: String(vehicle._id) });
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) { return apiError(error); }
}
