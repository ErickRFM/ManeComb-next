import { Journey } from "@/src/core/models/Journey";
import { LearnedRouteCandidate } from "@/src/core/models/LearnedRouteCandidate";
import { Route } from "@/src/core/models/Route";
import { RouteSessionPosition } from "@/src/core/models/RouteSessionPosition";
import { simplifyRoute, type GeoPoint } from "@/src/core/domain/route-learning";
import { writeAudit } from "@/src/core/services/audit";

export async function generateRouteCandidate(organizationId: string, routeId: string) {
  const route = await Route.findOne({ _id: routeId, organizationId });
  if (!route) throw new Error("Route not found");

  const journeys = await Journey.find({
    organizationId,
    routeId,
    state: "FINISHED"
  }).select("_id").sort({ finishedAt: -1 }).limit(20);

  if (!journeys.length) throw new Error("No finished journeys available for learning");

  const journeyIds = journeys.map((journey: any) => journey._id);
  const positions = await RouteSessionPosition.find({
    organizationId,
    journeyId: { $in: journeyIds }
  }).select("journeyId latitude longitude recordedAt").sort({ recordedAt: 1 }).limit(50_000);

  const traces = new Map<string, GeoPoint[]>();
  for (const position of positions as any[]) {
    const id = String(position.journeyId);
    const trace = traces.get(id) || [];
    trace.push({ latitude: position.latitude, longitude: position.longitude });
    traces.set(id, trace);
  }

  const usable = [...traces.values()].filter((trace) => trace.length >= 10);
  if (!usable.length) throw new Error("Not enough GPS samples to learn route");

  usable.sort((a, b) => b.length - a.length);
  const reference = usable[0];
  const geometry = simplifyRoute(reference, 20);
  const sampleCount = usable.reduce((sum, trace) => sum + trace.length, 0);
  const confidence = Math.min(0.95, 0.45 + Math.min(5, usable.length) * 0.1);

  return LearnedRouteCandidate.create({
    organizationId,
    routeId,
    geometry,
    sampleCount,
    confidence,
    status: "candidate"
  });
}

export async function reviewRouteCandidate(input: {
  organizationId: string;
  candidateId: string;
  actorUserId: string;
  action: "approved" | "rejected";
}) {
  const candidate = await LearnedRouteCandidate.findOne({
    _id: input.candidateId,
    organizationId: input.organizationId,
    status: "candidate"
  });
  if (!candidate) throw new Error("Candidate not found");

  candidate.status = input.action;
  candidate.reviewedBy = input.actorUserId;
  candidate.reviewedAt = new Date();
  await candidate.save();

  if (input.action === "approved") {
    const route = await Route.findOne({ _id: candidate.routeId, organizationId: input.organizationId });
    if (!route) throw new Error("Route not found");
    route.geometry = candidate.geometry;
    route.revision = (route.revision || 1) + 1;
    await route.save();
  }

  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "route_candidate." + input.action,
    entityType: "LearnedRouteCandidate",
    entityId: String(candidate._id),
    metadata: { routeId: String(candidate.routeId), confidence: candidate.confidence, sampleCount: candidate.sampleCount }
  });

  return candidate;
}
