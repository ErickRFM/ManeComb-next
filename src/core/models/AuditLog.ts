import mongoose from "mongoose";

const { Schema } = mongoose;
const AuditLogSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  actorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  action: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ["security","billing","organization","release","system","operations"],
    default: "operations",
    index: true
  },
  entityType: String,
  entityId: String,
  metadata: Schema.Types.Mixed,
  occurredAt: { type: Date, default: Date.now, immutable: true, index: true }
}, { timestamps: false, strict: true });
export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
