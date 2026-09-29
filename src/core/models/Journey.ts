import { Schema, model, models } from "mongoose";
const JourneySchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
  driverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  routeId: { type: Schema.Types.ObjectId, ref: "Route", default: null },
  state: { type: String, enum: ["ASSIGNED", "READY", "RUNNING", "PAUSED", "FINISHED", "CANCELLED"], default: "ASSIGNED", index: true },
  startedAt: Date, finishedAt: Date, cancelReason: String, finalOdometerKm: Number
}, { timestamps: true });
export const Journey = models.Journey || model("Journey", JourneySchema);
