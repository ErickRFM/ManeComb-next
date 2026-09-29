import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { createSessionForUser, SESSION_COOKIE } from "@/src/lib/auth";
import {
  decryptMfaSecret,
  extractMfaChallenge,
  MFA_CHALLENGE_COOKIE,
  verifyMfaChallenge,
  verifyTotp
} from "@/src/lib/mfa";
import { User } from "@/src/core/models/User";
import { writeAudit } from "@/src/core/services/audit";

const Input = z.object({ code: z.string().regex(/^\d{6}$/) });
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = extractMfaChallenge(request);
    if (!token) throw new Error("UNAUTHORIZED");
    const challenge = await verifyMfaChallenge(token);
    const { code } = Input.parse(await request.json());

    await connectDb();
    const user = await User.findOne({ _id: challenge.userId, active: true, channel: "platform_admin" })
      .select("+mfaSecretEncrypted +mfaPendingSecretEncrypted +mfaPendingCreatedAt");
    if (!user) throw new Error("UNAUTHORIZED");

    let encryptedSecret: string | null = null;
    if (challenge.mode === "setup") {
      const pendingAt = user.mfaPendingCreatedAt ? new Date(user.mfaPendingCreatedAt).getTime() : 0;
      if (!user.mfaPendingSecretEncrypted || Date.now() - pendingAt > 10 * 60 * 1000) {
        return NextResponse.json({ error: "MFA setup expired; generate a new secret" }, { status: 400 });
      }
      encryptedSecret = user.mfaPendingSecretEncrypted;
    } else {
      if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
        return NextResponse.json({ error: "MFA is not configured" }, { status: 400 });
      }
      encryptedSecret = user.mfaSecretEncrypted;
    }

    if (!encryptedSecret) {
      return NextResponse.json({ error: "MFA secret unavailable" }, { status: 400 });
    }
    const secret = decryptMfaSecret(encryptedSecret);
    if (!verifyTotp(secret, code)) {
      return NextResponse.json({ error: "Código MFA inválido" }, { status: 401 });
    }

    if (challenge.mode === "setup") {
      user.mfaEnabled = true;
      user.mfaSecretEncrypted = encryptedSecret;
      user.mfaPendingSecretEncrypted = null;
      user.mfaPendingCreatedAt = null;
      await user.save();
      await writeAudit({
        actorUserId: String(user._id),
        action: "auth.mfa_enabled",
        entityType: "User",
        entityId: String(user._id)
      });
    }

    const session = await createSessionForUser(user, { mfaVerified: true });
    const response = NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        channel: user.channel,
        roles: user.roles
      }
    });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: session.expiresAt
    });
    response.cookies.set(MFA_CHALLENGE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0)
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
