import mongoose from "mongoose";

const { Schema } = mongoose;
const PushSubscriptionSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  endpoint: { type: String, required: true, unique: true, index: true },
  keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
  userAgent: String,
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });
PushSubscriptionSchema.index({ organizationId: 1, userId: 1, active: 1 });
export const PushSubscription = mongoose.models.PushSubscription || mongoose.model("PushSubscription", PushSubscriptionSchema);
