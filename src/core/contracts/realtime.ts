import { z } from "zod";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";

const ChannelIdSchema = z.string().trim().min(1).max(80);

const ChatAttachmentSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(500),
  resourceType: z.string().min(1).max(50),
  bytes: z.number().int().min(1).max(8 * 1024 * 1024),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileName: z.string().min(1).max(255)
});

export const SocketTelemetrySchema = TelemetrySchema.extend({ recordedAt: z.coerce.date().optional() });
export const ChatMessageSchema = z.object({
  channelId: ChannelIdSchema,
  clientMessageId: z.string().min(1).max(120),
  recipientUserId: z.string().min(1).optional(),
  kind: z.enum(["text", "image"]).default("text"),
  body: z.string().max(5000).optional().default(""),
  attachment: ChatAttachmentSchema.optional()
}).superRefine((value, ctx) => {
  if (value.kind === "text" && !value.body.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Text message body is required" });
  }
  if (value.kind === "image" && !value.attachment) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["attachment"], message: "Image attachment is required" });
  }
});
export const RadioFloorSchema = z.object({ channelId: ChannelIdSchema });
export const RadioAudioSchema = z.object({ channelId: ChannelIdSchema, chunk: z.string().min(1).max(512_000) });
export const RtcSignalSchema = z.object({ targetUserId: z.string().min(1), signal: z.unknown() });
