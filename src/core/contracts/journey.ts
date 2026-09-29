import { z } from "zod";

export const JourneyStateSchema = z.enum(["ASSIGNED", "READY", "RUNNING", "PAUSED", "FINISHED", "CANCELLED"]);
export type JourneyState = z.infer<typeof JourneyStateSchema>;
export const JourneyActionSchema = z.enum(["ready", "start", "pause", "resume", "finish", "cancel"]);
export type JourneyAction = z.infer<typeof JourneyActionSchema>;
