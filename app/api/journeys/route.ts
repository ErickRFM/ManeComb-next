import { NextResponse } from "next/server";
import { z } from "zod";
import { JourneyActionSchema } from "@/src/core/contracts/journey";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { applyJourneyAction } from "@/src/core/services/journeys";
import { Journey } from "@/src/core/models/Journey";
import { User } from "@/src/core/models/User";
import { Vehicle } from "@/src/core/models/Vehicle";

const ChecklistSchema = z.object({
  brakes: z.boolean(),
  tires: z.boolean(),
  lights: z.boolean(),
  fuel: z.boolean(),
  cleanliness: z.boolean(),
  odometerStartKm: z.number().min(0)
});

const ActionSchema = z.object({
  journeyId: z.string().min(1),
  action: JourneyActionSchema,
  checklist: ChecklistSchema.optional(),
  cancelReason: z.string().max(500).optional(),
  finalOdometerKm: z.number().min(0).optional()
});

const AssignmentSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  routeId: z.string().min(1).optional()
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal", "mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    await connectDb();

    const query: Record<string, unknown> = { organizationId: session.organizationId };
    if (session.channel === "mobile_operations") {
      query.driverId = session.sub;
      query.state = { $nin: ["FINISHED", "CANCELLED"] };
    }

    const journeys = await Journey.find(query)
      .sort({ createdAt: -1 })
      .limit(session.channel === "mobile_operations" ? 10 : 100)
      .lean();

    return NextResponse.json({ journeys });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const input = AssignmentSchema.parse(await request.json());
    await connectDb();

    const [driver, vehicle, active] = await Promise.all([
      User.exists({ _id: input.driverId, organizationId: session.organizationId, channel: "mobile_operations", active: true }),
      Vehicle.exists({ _id: input.vehicleId, organizationId: session.organizationId, status: { $ne: "archived" } }),
      Journey.exists({
        organizationId: session.organizationId,
        $or: [{ driverId: input.driverId }, { vehicleId: input.vehicleId }],
        state: { $nin: ["FINISHED", "CANCELLED"] }
      })
    ]);

    if (!driver) throw new Error("Driver not found");
    if (!vehicle) throw new Error("Vehicle not found");
    if (active) throw new Error("Driver or vehicle already has an active journey");

    const journey = await Journey.create({
      organizationId: session.organizationId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      routeId: input.routeId || null,
      state: "ASSIGNED"
    });
    return NextResponse.json({ journey }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal", "mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    const input = ActionSchema.parse(await request.json());
    await connectDb();

    const journey = await applyJourneyAction({
      ...input,
      organizationId: session.organizationId,
      actorUserId: session.sub,
      requiredDriverId: session.channel === "mobile_operations" ? session.sub : undefined
    });
    return NextResponse.json({ journey });
  } catch (error) { return apiError(error); }
}
