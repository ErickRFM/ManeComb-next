import mongoose from "mongoose";
const { Schema } = mongoose;
const MessageSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  senderUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recipientUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  channelId: { type: String, required: true, index: true },
  kind: { type: String, enum: ["text","image","system"], default: "text" },
  body: { type: String, required: true },
  clientMessageId: { type: String, required: true }
}, { timestamps: true });
MessageSchema.index({ organizationId: 1, clientMessageId: 1 }, { unique: true });
export const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);
