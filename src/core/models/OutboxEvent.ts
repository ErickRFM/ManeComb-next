import mongoose from "mongoose";
const { Schema } = mongoose;
const OutboxEventSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  type: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["pending","queued","processed","failed"], default: "pending", index: true },
  attempts: { type: Number, default: 0 },
  lastError: String,
  processedAt: Date
}, { timestamps: true });
export const OutboxEvent = mongoose.models.OutboxEvent || mongoose.model("OutboxEvent", OutboxEventSchema);
