import mongoose from "mongoose";

const { Schema } = mongoose;
const WebhookEventSchema = new Schema({
  provider: { type: String, required: true, index: true },
  eventId: { type: String, required: true },
  payload: Schema.Types.Mixed,
  processedAt: Date
}, { timestamps: true });
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
export const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", WebhookEventSchema);
