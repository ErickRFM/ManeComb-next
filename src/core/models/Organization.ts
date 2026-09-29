import { Schema, model, models } from "mongoose";
const OrganizationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ["active", "paused", "suspended"], default: "active", index: true },
  planCode: { type: String, default: "unsubscribed" }
}, { timestamps: true });
export const Organization = models.Organization || model("Organization", OrganizationSchema);
