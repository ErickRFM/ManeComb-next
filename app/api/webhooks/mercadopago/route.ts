import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { getEnv } from "@/src/lib/env";
import { WebhookEvent } from "@/src/core/models/WebhookEvent";
import { verifyMercadoPagoWebhook } from "@/src/core/services/mercadopago";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = getEnv().mercadoPagoWebhookSecret;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });

  const url = new URL(request.url);
  const payload = await request.json().catch(() => ({}));
  const dataId = String(url.searchParams.get("data.id") || payload?.data?.id || "");
  const valid = verifyMercadoPagoWebhook({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  await connectDb();
  const eventId = String(payload?.id || dataId || request.headers.get("x-request-id"));
  await WebhookEvent.updateOne(
    { provider: "mercadopago", eventId },
    { $setOnInsert: { provider: "mercadopago", eventId, payload } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
