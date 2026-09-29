import { Schema, model, models } from "mongoose";

const AttachmentSchema = new Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, required: true },
  bytes: { type: Number, required: true, min: 1 },
  mimeType: { type: String, required: true },
  fileName: { type: String, required: true }
}, { _id: false });

const MessageSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  senderUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recipientUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  channelId: { type: String, required: true, index: true },
  kind: { type: String, enum: ["text","image","system"], default: "text" },
  body: { type: String, default: "" },
  attachment: { type: AttachmentSchema, default: null },
  clientMessageId: { type: String, required: true }
}, { timestamps: true });

MessageSchema.index({ organizationId: 1, clientMessageId: 1 }, { unique: true });
MessageSchema.index({ organizationId: 1, channelId: 1, createdAt: -1 });

export const Message = models.Message || model("Message", MessageSchema);
