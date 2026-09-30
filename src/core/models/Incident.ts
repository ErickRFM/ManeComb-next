import mongoose from "mongoose";
const { Schema } = mongoose;
const IncidentSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", default: null },
  driverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  type: { type: String, enum: ["traffic","mechanical","accident","police","robbery","medical","sos","other"], required: true },
  status: { type: String, enum: ["open","acknowledged","resolved"], default: "open", index: true },
  message: String, latitude: Number, longitude: Number, resolvedAt: Date
}, { timestamps: true });
export const Incident = mongoose.models.Incident || mongoose.model("Incident", IncidentSchema);
