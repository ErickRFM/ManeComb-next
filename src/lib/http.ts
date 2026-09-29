import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (message === "UNAUTHORIZED") return NextResponse.json({ error: message }, { status: 401 });
  if (message === "FORBIDDEN") return NextResponse.json({ error: message }, { status: 403 });
  if (message === "RATE_LIMITED") return NextResponse.json({ error: message }, { status: 429 });
  if (message === "RATE_LIMIT_UNAVAILABLE") return NextResponse.json({ error: message }, { status: 503 });
  if (["SUBSCRIPTION_INACTIVE","SUBSCRIPTION_EXPIRED","SUBSCRIPTION_PLAN_INVALID"].includes(message)) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message === "VEHICLE_LIMIT_REACHED") return NextResponse.json({ error: message }, { status: 409 });
  if (message.startsWith("Invalid journey transition")) return NextResponse.json({ error: message }, { status: 409 });
  return NextResponse.json({ error: message }, { status: 400 });
}
