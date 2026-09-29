import mongoose from "mongoose";

const { Schema } = mongoose;
const OrganizationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ["active", "paused", "suspended"], default: "active", index: true },
  planCode: { type: String, default: "unsubscribed" }
}, { timestamps: true });
export const Organization = mongoose.models.Organization || mongoose.model("Organization", OrganizationSchema);
