import type { JourneyAction, JourneyState } from "@/src/core/contracts/journey";
import { transitionJourney } from "@/src/core/domain/journey-lifecycle";
import { Journey } from "@/src/core/models/Journey";
import { writeAudit } from "@/src/core/services/audit";

export async function applyJourneyAction(input: {
  organizationId: string;
  journeyId: string;
  actorUserId: string;
  action: JourneyAction;
  cancelReason?: string;
  finalOdometerKm?: number;
}) {
  const journey = await Journey.findOne({ _id: input.journeyId, organizationId: input.organizationId });
  if (!journey) throw new Error("Journey not found");
  const next = transitionJourney(journey.state as JourneyState, input.action);
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
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "journey." + input.action,
    entityType: "Journey",
    entityId: String(journey._id),
    metadata: { from: journey.modifiedPaths().includes("state"), to: next }
  });
  return journey;
}
