import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/src/lib/auth";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { Incident } from "@/src/core/models/Incident";
import { Journey } from "@/src/core/models/Journey";
import { Vehicle } from "@/src/core/models/Vehicle";
import { emitToOrganization } from "@/src/realtime/runtime";
import { enqueueOutboxEvent } from "@/src/core/services/outbox";
import { assertPermission } from "@/src/core/domain/permissions";
import { writeAudit } from "@/src/core/services/audit";

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
    if (!session.organizationId) throw new Error("FORBIDDEN");
    assertPermission(session.roles, "manage_incidents");
    await connectDb();
    const incidents = await Incident.find({ organizationId: session.organizationId }).sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ incidents });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request, ["company_portal","mobile_operations"]);
    if (!session.organizationId) throw new Error("FORBIDDEN");
    if (session.channel === "company_portal") assertPermission(session.roles, "manage_incidents");
    const input = IncidentInput.parse(await request.json());
    await connectDb();

    let vehicleId = input.vehicleId || null;
    if (session.channel === "mobile_operations") {
      const activeJourney = await Journey.findOne({
        organizationId: session.organizationId,
        driverId: session.sub,
        state: { $in: ["READY","RUNNING","PAUSED"] }
      }).sort({ createdAt: -1 }).select("vehicleId").lean() as { vehicleId?: unknown } | null;
      const assignedVehicleId = activeJourney?.vehicleId ? String(activeJourney.vehicleId) : null;
      if (vehicleId && assignedVehicleId && vehicleId !== assignedVehicleId) throw new Error("FORBIDDEN");
      vehicleId = vehicleId || assignedVehicleId;
    } else if (vehicleId) {
      const exists = await Vehicle.exists({ _id: vehicleId, organizationId: session.organizationId, status: { $ne: "archived" } });
      if (!exists) throw new Error("Vehicle not found");
    }

    const incident = await Incident.create({
      organizationId: session.organizationId,
      driverId: session.channel === "mobile_operations" ? session.sub : null,
      ...input,
      vehicleId
    });

    await writeAudit({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "incident.create",
      entityType: "Incident",
      entityId: String(incident._id),
      metadata: { type: input.type, vehicleId }
    });

    emitToOrganization(session.organizationId, "incident:new", incident.toObject());
    await enqueueOutboxEvent("push.send", {
      title: input.type === "sos" ? "SOS ManeComb" : "Nueva incidencia",
      body: input.message || ("Incidencia " + input.type + " reportada"),
      url: "/portal/incidencias",
      tag: "incident-" + String(incident._id)
    }, session.organizationId);
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) { return apiError(error); }
}
