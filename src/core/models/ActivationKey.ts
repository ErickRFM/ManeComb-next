import mongoose from "mongoose";
const { Schema } = mongoose;
const ActivationKeySchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  driverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", default: null },
  codeHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });
export const ActivationKey = mongoose.models.ActivationKey || mongoose.model("ActivationKey", ActivationKeySchema);
