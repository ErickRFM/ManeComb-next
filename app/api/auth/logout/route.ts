import { NextResponse } from "next/server";
import { extractRequestToken, revokeSession, SESSION_COOKIE, verifySessionToken } from "@/src/lib/auth";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = extractRequestToken(request);
  if (token) {
    try {
      const session = await verifySessionToken(token);
      await revokeSession(session.jti);
    } catch {}
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
  return response;
}
