import { Schema, model, models } from "mongoose";
const VehicleSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  economicNumber: { type: String, required: true, trim: true },
  plates: { type: String, trim: true },
  model: { type: String, trim: true },
  capacity: { type: Number, min: 1 },
  status: { type: String, enum: ["active", "running", "maintenance", "archived"], default: "active", index: true },
  routeId: { type: Schema.Types.ObjectId, ref: "Route", default: null },
  driverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  lastLocation: {
    latitude: Number, longitude: Number, speedMps: Number, heading: Number, accuracy: Number, recordedAt: Date
  }
}, { timestamps: true });
VehicleSchema.index({ organizationId: 1, economicNumber: 1 }, { unique: true });
export const Vehicle = models.Vehicle || model("Vehicle", VehicleSchema);
