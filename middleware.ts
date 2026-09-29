import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const protectedPrefixes = [
  { prefix: "/portal", channel: "company_portal" },
  { prefix: "/admin", channel: "platform_admin" },
  { prefix: "/operacion", channel: "mobile_operations" }
] as const;

export async function middleware(request: NextRequest) {
  const rule = protectedPrefixes.find((item) => request.nextUrl.pathname.startsWith(item.prefix));
  if (!rule) return NextResponse.next();
  const token = request.cookies.get("manecomb_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.channel !== rule.channel) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
export const config = { matcher: ["/portal/:path*", "/admin/:path*", "/operacion/:path*"] };
