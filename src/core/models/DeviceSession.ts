import mongoose from "mongoose";

const { Schema } = mongoose;

const DeviceSessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
  journeyId: { type: Schema.Types.ObjectId, ref: "Journey", required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null, index: true },
  lastSeenAt: { type: Date, default: null, index: true },
  lastDiagnostics: {
    platform: { type: String, default: null },
    trackingVersion: { type: String, default: null },
    appVersionName: { type: String, default: null },
    appVersionCode: { type: Number, default: null },
    queueDepth: { type: Number, default: null },
    networkState: { type: String, default: null }
  }
}, { timestamps: true });

DeviceSessionSchema.index({ organizationId: 1, userId: 1, journeyId: 1, revokedAt: 1 });
DeviceSessionSchema.index({ organizationId: 1, vehicleId: 1, lastSeenAt: -1 });

export const DeviceSession = mongoose.models.DeviceSession || mongoose.model("DeviceSession", DeviceSessionSchema);
