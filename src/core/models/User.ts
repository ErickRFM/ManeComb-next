import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true, default: null },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  roles: [{ type: String, required: true }],
  channel: { type: String, enum: ["company_portal", "mobile_operations", "platform_admin"], required: true },
  active: { type: Boolean, default: true },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecretEncrypted: { type: String, default: null, select: false },
  mfaPendingSecretEncrypted: { type: String, default: null, select: false },
  mfaPendingCreatedAt: { type: Date, default: null, select: false }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
