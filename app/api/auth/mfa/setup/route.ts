import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import {
  buildTotpUri,
  encryptMfaSecret,
  extractMfaChallenge,
  generateTotpSecret,
  verifyMfaChallenge
} from "@/src/lib/mfa";
import { User } from "@/src/core/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = extractMfaChallenge(request);
    if (!token) throw new Error("UNAUTHORIZED");
    const challenge = await verifyMfaChallenge(token);
    if (challenge.mode !== "setup") throw new Error("FORBIDDEN");
    await enforceRateLimit(request,"auth:mfa-setup",{limit:5,windowSeconds:600,identity:challenge.userId});

    await connectDb();
    const user = await User.findOne({ _id: challenge.userId, active: true, channel: "platform_admin" })
      .select("+mfaPendingSecretEncrypted +mfaPendingCreatedAt mfaEnabled email");
    if (!user) throw new Error("UNAUTHORIZED");
    if (user.mfaEnabled) {
      return NextResponse.json({ error: "MFA is already enabled" }, { status: 409 });
    }

    const secret = generateTotpSecret();
    user.mfaPendingSecretEncrypted = encryptMfaSecret(secret);
    user.mfaPendingCreatedAt = new Date();
    await user.save();

    return NextResponse.json({
      secret,
      uri: buildTotpUri(user.email, secret),
      expiresInSeconds: 10 * 60
    });
  } catch (error) {
    return apiError(error);
  }
}
