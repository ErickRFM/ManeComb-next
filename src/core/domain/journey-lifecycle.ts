import type { JourneyAction, JourneyState } from "@/src/core/contracts/journey";

const transitions: Record<JourneyState, Partial<Record<JourneyAction, JourneyState>>> = {
  ASSIGNED: { ready: "READY", cancel: "CANCELLED" },
  READY: { start: "RUNNING", cancel: "CANCELLED" },
  RUNNING: { pause: "PAUSED", finish: "FINISHED", cancel: "CANCELLED" },
  PAUSED: { resume: "RUNNING", finish: "FINISHED", cancel: "CANCELLED" },
  FINISHED: {},
  CANCELLED: {}
};

export function transitionJourney(current: JourneyState, action: JourneyAction): JourneyState {
  const next = transitions[current][action];
  if (!next) throw new Error("Invalid journey transition: " + current + " -> " + action);
  return next;
}

export function canTransitionJourney(current: JourneyState, action: JourneyAction) {
  return Boolean(transitions[current][action]);
}
