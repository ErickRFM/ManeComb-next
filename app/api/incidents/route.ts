import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Incident } from "@/src/core/models/Incident";
import { emitToOrganization } from "@/src/realtime/runtime";

const IncidentInput = z.object({
  vehicleId: z.string().optional(),
  type: z.enum(["traffic","mechanical","accident","police","robbery","medical","sos","other"]),
  message: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal"]);
    await connectDb();
    const incidents = await Incident.find({ organizationId: session.organizationId }).sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ incidents });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal","mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const input = IncidentInput.parse(await request.json());
    await connectDb();
    const incident = await Incident.create({ organizationId: session.organizationId, driverId: session.channel === "mobile_operations" ? session.sub : null, ...input });
    emitToOrganization(session.organizationId, "incident:new", incident.toObject());
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) { return apiError(error); }
}
