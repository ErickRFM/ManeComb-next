import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/authorization";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Route } from "@/src/core/models/Route";
import { writeAudit } from "@/src/core/services/audit";

const Point = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
const Stop = Point.extend({ name: z.string().min(1), order: z.number().int().min(0), radiusM: z.number().min(10).max(1000).default(50) });
const RouteInput = z.object({
  name: z.string().min(1).max(120),
  origin: z.string().max(120).optional(),
  destination: z.string().max(120).optional(),
  geometry: z.array(Point).min(2),
  stops: z.array(Stop).default([]),
  distanceKm: z.number().min(0).optional(),
  status: z.enum(["draft","active"]).default("draft")
});
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = assertPermission(await requireApiSession(request, ["company_portal"]), "view_analytics");
    await connectDb();
    const routes = await Route.find({ organizationId: session.organizationId }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ routes });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const session = assertPermission(await requireApiSession(request, ["company_portal"]), "manage_routes");
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const input = RouteInput.parse(await request.json());
    await connectDb();
    const route = await Route.create({ organizationId: session.organizationId, ...input });
    await writeAudit({ organizationId: session.organizationId, actorUserId: session.sub, action: "route.create", entityType: "Route", entityId: String(route._id) });
    return NextResponse.json({ route }, { status: 201 });
  } catch (error) { return apiError(error); }
}
