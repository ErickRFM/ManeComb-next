import { z } from "zod";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";

export const SocketTelemetrySchema = TelemetrySchema.extend({ recordedAt: z.coerce.date().optional() });
export const ChatMessageSchema = z.object({
  channelId: z.string().min(1),
  clientMessageId: z.string().min(1),
  recipientUserId: z.string().min(1).optional(),
  kind: z.enum(["text", "image"]).default("text"),
  body: z.string().min(1).max(5000)
});
export const RadioFloorSchema = z.object({ channelId: z.string().min(1) });
export const RadioAudioSchema = z.object({ channelId: z.string().min(1), chunk: z.string().min(1).max(512_000) });
export const RtcSignalSchema = z.object({ targetUserId: z.string().min(1), signal: z.unknown() });
