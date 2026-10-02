import mongoose from "mongoose";

const { Schema } = mongoose;
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
  recordedAt: { type: Date, required: true, index: true },
  receivedAt: Date,
  canonicalRecordedAt: Date,
  temporalEvidence: {type:Schema.Types.Mixed,default:null},
  classification: String,
  decisionReason: String,
  applicationStatus: {type:String,enum:["PENDING","APPLIED","HISTORICAL_ONLY","SUPERSEDED"]},
  quality: {type:Schema.Types.Mixed,default:null}
}, { timestamps: true });
PositionSchema.index({ organizationId: 1, vehicleId: 1, recordedAt: -1 });
PositionSchema.index({ organizationId: 1, packetId: 1 }, { unique: true, sparse: true });
export const RouteSessionPosition = mongoose.models.RouteSessionPosition || mongoose.model("RouteSessionPosition", PositionSchema);
