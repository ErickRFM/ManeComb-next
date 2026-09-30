import { z } from "zod";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";

const ChannelIdSchema = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9:_-]+$/);

export const SocketTelemetrySchema = TelemetrySchema.extend({ recordedAt: z.coerce.date().optional() });
export const ChatJoinSchema = z.object({ channelId: ChannelIdSchema });
export const ChatMessageSchema = z.object({
  channelId: ChannelIdSchema,
  clientMessageId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9:_-]+$/),
  recipientUserId: z.string().min(1).optional(),
  kind: z.enum(["text", "image"]).default("text"),
  body: z.string().min(1).max(5000)
});
export const RadioFloorSchema = z.object({ channelId: ChannelIdSchema });
export const RadioAudioSchema = z.object({ channelId: ChannelIdSchema, chunk: z.string().min(1).max(512_000) });
export const RtcSignalSchema = z.object({ targetUserId: z.string().min(1), signal: z.unknown() });
