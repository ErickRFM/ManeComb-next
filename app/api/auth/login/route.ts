import { compare } from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { createSessionForUser, SESSION_COOKIE } from "@/src/lib/auth";
import { MFA_CHALLENGE_COOKIE, signMfaChallenge } from "@/src/lib/mfa";
import { User } from "@/src/core/models/User";

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = LoginSchema.parse(await request.json());
    await enforceRateLimit(request, "auth:login", { limit: 10, windowSeconds: 300, identity: input.email });
    await connectDb();
    const user = await User.findOne({ email: input.email.toLowerCase(), active: true });
    if (!user || !(await compare(input.password, user.passwordHash))) throw new Error("UNAUTHORIZED");

    const userPayload = {
      id: String(user._id), name: user.name, roles: user.roles, channel: user.channel,
      organizationId: user.organizationId ? String(user.organizationId) : null
    };

    if (user.channel === "platform_admin") {
      const setupRequired = user.mfaEnabled !== true;
      const challenge = await signMfaChallenge(String(user._id), setupRequired ? "setup" : "verify");
      const response = NextResponse.json({ user: userPayload, mfaRequired: true, setupRequired });
      response.cookies.set(MFA_CHALLENGE_COOKIE, challenge, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 10 * 60
      });
      return response;
    }

    const session = await createSessionForUser(user);
    const response = NextResponse.json({ user: userPayload, mfaRequired: false });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: session.expiresAt
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
