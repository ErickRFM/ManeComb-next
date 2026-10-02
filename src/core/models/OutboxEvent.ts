import mongoose from "mongoose";

const { Schema } = mongoose;
const OutboxEventSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  type: { type: String, required: true, index: true },
  idempotencyKey: { type: String },
  payload: { type: Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ["pending","queued","processing","retry_pending","processed","failed","failed_final"],
    default: "pending",
    index: true
  },
  attempts: { type: Number, default: 0 },
  lastAttemptAt: Date,
  lastError: String,
  providerMessageId: String,
  processedAt: Date
}, { timestamps: true });

OutboxEventSchema.index({status:1,createdAt:1});
OutboxEventSchema.index({idempotencyKey:1},{unique:true,sparse:true});
export const OutboxEvent = mongoose.models.OutboxEvent || mongoose.model("OutboxEvent", OutboxEventSchema);
