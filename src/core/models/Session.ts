import { Schema, model, models } from "mongoose";
const SessionSchema = new Schema({
  jti: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });
export const Session = models.Session || model("Session", SessionSchema);
