import mongoose from "mongoose";

const { Schema } = mongoose;

const CheckoutIdempotencySchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  key: { type: String, required: true },
  planCode: { type: String, required: true },
  provider: { type: String, enum: ["mercadopago"], default: "mercadopago" },
  providerSubscriptionId: String,
  initPoint: String,
  activeIntent: Boolean,
  status: { type: String, enum: ["created","pending","active","failed","cancelled"], default: "created", index: true }
}, { timestamps: true });

CheckoutIdempotencySchema.index({ organizationId: 1, key: 1 }, { unique: true });
CheckoutIdempotencySchema.index({ organizationId: 1 }, { name:"one_active_checkout_per_org", unique: true, partialFilterExpression: { activeIntent: true } });

export const CheckoutIdempotency = mongoose.models.CheckoutIdempotency || mongoose.model("CheckoutIdempotency", CheckoutIdempotencySchema);
