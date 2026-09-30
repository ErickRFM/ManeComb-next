import mongoose from "mongoose";

const { Schema } = mongoose;
const PointSchema = new Schema({ latitude: Number, longitude: Number }, { _id: false });
const StopSchema = new Schema({ name: String, order: Number, latitude: Number, longitude: Number, radiusM: { type: Number, default: 50 } }, { _id: false });
const RouteSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  name: { type: String, required: true, trim: true },
  origin: String, destination: String, geometry: [PointSchema], stops: [StopSchema],
  distanceKm: Number, revision: { type: Number, default: 1 },
  status: { type: String, enum: ["draft", "active", "archived"], default: "draft" }
}, { timestamps: true });
export const Route = mongoose.models.Route || mongoose.model("Route", RouteSchema);
