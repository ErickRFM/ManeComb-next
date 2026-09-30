import mongoose from "mongoose";
const { Schema } = mongoose;

const ChecklistSchema = new Schema({
  brakes: { type: Boolean, default: false },
  tires: { type: Boolean, default: false },
  lights: { type: Boolean, default: false },
  fuel: { type: Boolean, default: false },
  cleanliness: { type: Boolean, default: false },
  odometerStartKm: { type: Number, min: 0 }
}, { _id: false });

const JourneySchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
  driverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  routeId: { type: Schema.Types.ObjectId, ref: "Route", default: null },
  state: { type: String, enum: ["ASSIGNED", "READY", "RUNNING", "PAUSED", "FINISHED", "CANCELLED"], default: "ASSIGNED", index: true },
  checklist: { type: ChecklistSchema, default: null },
  startedAt: Date,
  finishedAt: Date,
  cancelReason: String,
  finalOdometerKm: Number
}, { timestamps: true });

JourneySchema.index({ organizationId: 1, driverId: 1, state: 1 });
JourneySchema.index({ organizationId: 1, vehicleId: 1, state: 1 });

export const Journey = mongoose.models.Journey || mongoose.model("Journey", JourneySchema);
