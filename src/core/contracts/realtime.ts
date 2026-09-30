import { z } from "zod";
import { TelemetrySchema } from "@/src/core/contracts/telemetry";

const ChannelIdSchema = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9:_-]+$/);
const ChatAttachmentSchema=z.object({
  url:z.string().url(),publicId:z.string().min(1).max(500),resourceType:z.literal("image"),
  bytes:z.number().int().min(1).max(8*1024*1024),mimeType:z.enum(["image/jpeg","image/png","image/webp"]),fileName:z.string().min(1).max(255)
});

export const SocketTelemetrySchema = TelemetrySchema.extend({ recordedAt: z.coerce.date().optional() });
export const ChatJoinSchema = z.object({ channelId: ChannelIdSchema });
export const ChatMessageSchema = z.object({
  channelId: ChannelIdSchema,
  clientMessageId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9:_-]+$/),
  recipientUserId: z.string().min(1).optional(),
  kind: z.enum(["text", "image"]).default("text"),
  body: z.string().max(5000).default(""),
  attachment:ChatAttachmentSchema.optional()
}).superRefine((message,ctx)=>{
  if(message.kind==="text"&&!message.body.trim())ctx.addIssue({code:z.ZodIssueCode.custom,path:["body"],message:"Text body is required"});
  if(message.kind==="text"&&message.attachment)ctx.addIssue({code:z.ZodIssueCode.custom,path:["attachment"],message:"Text messages cannot contain attachments"});
  if(message.kind==="image"&&!message.attachment)ctx.addIssue({code:z.ZodIssueCode.custom,path:["attachment"],message:"Managed image attachment is required"});
});
export const RadioFloorSchema = z.object({ channelId: ChannelIdSchema });
export const RadioAudioSchema = z.object({ channelId: ChannelIdSchema, chunk: z.string().min(1).max(512_000) });
export const RtcSignalSchema = z.object({ targetUserId: z.string().min(1), signal: z.unknown() });
