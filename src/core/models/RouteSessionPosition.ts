import { Schema, model, models } from "mongoose";
const PositionSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
  journeyId: { type: Schema.Types.ObjectId, ref: "Journey", default: null, index: true },
  packetId: { type: String, default: null },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speedMps: { type: Number, default: 0 },
  heading: Number,
  accuracy: Number,
  recordedAt: { type: Date, required: true, index: true }
}, { timestamps: true });
PositionSchema.index({ organizationId: 1, vehicleId: 1, recordedAt: -1 });
PositionSchema.index({ organizationId: 1, packetId: 1 }, { unique: true, sparse: true });
export const RouteSessionPosition = models.RouteSessionPosition || model("RouteSessionPosition", PositionSchema);
