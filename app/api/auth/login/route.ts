import { compare } from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { createSessionForUser, SESSION_COOKIE } from "@/src/lib/auth";
import { User } from "@/src/core/models/User";

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = LoginSchema.parse(await request.json());
    await connectDb();
    const user = await User.findOne({ email: input.email.toLowerCase(), active: true });
    if (!user || !(await compare(input.password, user.passwordHash))) throw new Error("UNAUTHORIZED");
    const session = await createSessionForUser(user);
    const response = NextResponse.json({
      user: { id: String(user._id), name: user.name, roles: user.roles, channel: user.channel, organizationId: user.organizationId ? String(user.organizationId) : null }
    });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: session.expiresAt
    });
    return response;
  } catch (error) { return apiError(error); }
}
