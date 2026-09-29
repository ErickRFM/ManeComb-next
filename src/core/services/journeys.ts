import type { JourneyAction, JourneyState } from "@/src/core/contracts/journey";
import { transitionJourney } from "@/src/core/domain/journey-lifecycle";
import { Journey } from "@/src/core/models/Journey";
import { Vehicle } from "@/src/core/models/Vehicle";
import { writeAudit } from "@/src/core/services/audit";

type ChecklistInput = {
  brakes: boolean;
  tires: boolean;
  lights: boolean;
  fuel: boolean;
  cleanliness: boolean;
  odometerStartKm: number;
};

export async function applyJourneyAction(input: {
  organizationId: string;
  journeyId: string;
  actorUserId: string;
  requiredDriverId?: string;
  action: JourneyAction;
  checklist?: ChecklistInput;
  cancelReason?: string;
  finalOdometerKm?: number;
}) {
  const query: Record<string, unknown> = { _id: input.journeyId, organizationId: input.organizationId };
  if (input.requiredDriverId) query.driverId = input.requiredDriverId;

  const journey = await Journey.findOne(query);
  if (!journey) throw new Error("Journey not found");

  if (input.action === "ready") {
    const checklist = input.checklist;
    if (!checklist || !checklist.brakes || !checklist.tires || !checklist.lights || !checklist.fuel || !checklist.cleanliness) {
      throw new Error("Checklist must be completed before READY");
    }
    journey.checklist = checklist;
  }

  const previous = journey.state as JourneyState;
  const next = transitionJourney(previous, input.action);
  journey.state = next;

  if (next === "RUNNING" && !journey.startedAt) journey.startedAt = new Date();
  if (next === "FINISHED") {
    journey.finishedAt = new Date();
    if (typeof input.finalOdometerKm === "number") journey.finalOdometerKm = input.finalOdometerKm;
  }
  if (next === "CANCELLED") {
    journey.finishedAt = new Date();
    journey.cancelReason = input.cancelReason || "unspecified";
  }

  await journey.save();

  if (next === "RUNNING" || next === "PAUSED") {
    await Vehicle.updateOne(
      { _id: journey.vehicleId, organizationId: input.organizationId },
      { $set: { status: "running", driverId: journey.driverId, ...(journey.routeId ? { routeId: journey.routeId } : {}) } }
    );
  } else if (next === "FINISHED" || next === "CANCELLED") {
    await Vehicle.updateOne(
      { _id: journey.vehicleId, organizationId: input.organizationId },
      { $set: { status: "active" }, $unset: { driverId: 1 } }
    );
  }

  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "journey." + input.action,
    entityType: "Journey",
    entityId: String(journey._id),
    metadata: { from: previous, to: next }
  });
  return journey;
}
