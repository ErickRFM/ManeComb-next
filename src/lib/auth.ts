import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { parse } from "cookie";
import { connectDb } from "@/src/lib/db";
import { getEnv } from "@/src/lib/env";
import { SessionTokenSchema, type Channel, type SessionToken } from "@/src/core/contracts/auth";
import { Session } from "@/src/core/models/Session";
import { User } from "@/src/core/models/User";

const encoder = new TextEncoder();
const cookieName = "manecomb_session";

function authKey() {
  const secret = getEnv().authSecret;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return encoder.encode(secret);
}

export async function signSessionToken(payload: SessionToken) {
  return new SignJWT({
    organizationId: payload.organizationId,
    roles: payload.roles,
    channel: payload.channel,
    jti: payload.jti,
    mfaVerified: payload.mfaVerified
  }).setProtectedHeader({ alg: "HS256" }).setSubject(payload.sub).setIssuedAt().setExpirationTime("8h").sign(authKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, authKey());
  return SessionTokenSchema.parse({
    sub: payload.sub,
    organizationId: payload.organizationId ?? null,
    roles: payload.roles,
    channel: payload.channel,
    jti: payload.jti,
    mfaVerified: payload.mfaVerified ?? false
  });
}

export function extractRequestToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  const cookies = parse(request.headers.get("cookie") || "");
  return cookies[cookieName] || null;
}

export async function createSessionForUser(
  user: { _id: unknown; organizationId?: unknown; roles: string[]; channel: string },
  options?: { mfaVerified?: boolean }
) {
  await connectDb();
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await Session.create({ jti, userId: user._id, expiresAt });
  const channel = user.channel as Channel;
  const mfaVerified = channel !== "platform_admin" || options?.mfaVerified === true;
  const roles = Array.from(user.roles || [], (role) => String(role)) as SessionToken["roles"];
  const token = await signSessionToken({
    sub: String(user._id),
    organizationId: user.organizationId ? String(user.organizationId) : null,
    roles,
    channel,
    jti,
    mfaVerified
  });
  return { token, expiresAt };
}

export async function assertStoredSessionActive(session: SessionToken) {
  await connectDb();
  const stored = await Session.findOne({
    jti: session.jti,
    userId: session.sub,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });
  const user = await User.findOne({ _id: session.sub, active: true })
    .select("_id organizationId roles channel active");
  if (!stored || !user) throw new Error("UNAUTHORIZED");

  const organizationId = user.organizationId ? String(user.organizationId) : null;
  const currentRoles = [...(user.roles || [])].map(String).sort();
  const tokenRoles = [...session.roles].map(String).sort();
  if (
    organizationId !== session.organizationId ||
    user.channel !== session.channel ||
    JSON.stringify(currentRoles) !== JSON.stringify(tokenRoles)
  ) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRealtimeSession(token: string) {
  const session = await verifySessionToken(token);
  if (session.channel === "platform_admin" && !session.mfaVerified) throw new Error("UNAUTHORIZED");
  return assertStoredSessionActive(session);
}

export async function requireApiSession(request: Request, allowedChannels?: Channel[]) {
  const token = extractRequestToken(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const session = await verifySessionToken(token);
  if (session.channel === "platform_admin" && !session.mfaVerified) throw new Error("UNAUTHORIZED");
  if (allowedChannels && !allowedChannels.includes(session.channel)) throw new Error("FORBIDDEN");
  await assertStoredSessionActive(session);
  return session;
}

export async function revokeSession(jti: string) {
  await connectDb();
  await Session.updateOne({ jti }, { $set: { revokedAt: new Date() } });
}

export const SESSION_COOKIE = cookieName;
