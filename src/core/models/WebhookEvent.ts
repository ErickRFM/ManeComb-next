import { Schema, model, models } from "mongoose";
const WebhookEventSchema = new Schema({
  provider: { type: String, required: true, index: true },
  eventId: { type: String, required: true },
  payload: Schema.Types.Mixed,
  processedAt: Date
}, { timestamps: true });
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
export const WebhookEvent = models.WebhookEvent || model("WebhookEvent", WebhookEventSchema);
