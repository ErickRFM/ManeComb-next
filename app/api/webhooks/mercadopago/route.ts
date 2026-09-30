import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { getEnv } from "@/src/lib/env";
import { WebhookEvent } from "@/src/core/models/WebhookEvent";
import { verifyMercadoPagoWebhook } from "@/src/core/services/mercadopago";
import { mercadoPagoRequest, reconcilePreapproval } from "@/src/core/services/billing";
import { Subscription } from "@/src/core/models/Subscription";
import { writeAudit } from "@/src/core/services/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const env = getEnv();
  if (!env.mercadoPagoWebhookSecret || !env.mercadoPagoAccessToken) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const dataId = new URL(request.url).searchParams.get("data.id") || "";
  const requestId = request.headers.get("x-request-id");
  if (!verifyMercadoPagoWebhook({ signature: request.headers.get("x-signature"), requestId, dataId, secret: env.mercadoPagoWebhookSecret })) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  const type = String(payload?.type || "");
  const eventId = requestId!;
  try {
    await connectDb();
    const event = await WebhookEvent.findOneAndUpdate({ provider: "mercadopago", eventId }, { $setOnInsert: { provider: "mercadopago", eventId, payload: { type, dataId } } }, { upsert: true, new: true });
    if (event.processedAt) return NextResponse.json({ ok: true, reused: true });
    let provider: Record<string, any>;
    let payment: Record<string, any> | undefined;
    try {
      if (type === "subscription_preapproval") {
        provider = await mercadoPagoRequest("/preapproval/" + encodeURIComponent(dataId));
        if (String(provider.id) !== dataId) throw new Error("BILLING_CORRELATION_INVALID");
      } else if (type === "subscription_authorized_payment" || type === "payment") {
        payment = await mercadoPagoRequest((type === "payment" ? "/v1/payments/" : "/authorized_payments/") + encodeURIComponent(dataId));
        const preapprovalId = payment.preapproval_id || payment.metadata?.preapproval_id;
        if (!preapprovalId) throw new Error("BILLING_CORRELATION_INVALID");
        provider = await mercadoPagoRequest("/preapproval/" + encodeURIComponent(String(preapprovalId)));
        if (String(provider.id) !== String(preapprovalId)) throw new Error("BILLING_CORRELATION_INVALID");
      } else return NextResponse.json({ error: "Unsupported webhook type" }, { status: 422 });
    } catch {
      return NextResponse.json({ error: "Mercado Pago reconciliation failed" }, { status: 502 });
    }
    await mongoose.connection.transaction(async session => {
      const fresh = await WebhookEvent.findById(event._id).session(session);
      if (fresh?.processedAt) return;
      const subscription = await reconcilePreapproval(provider, session, eventId);
      if (payment && subscription?.providerSubscriptionId === String(provider.id)) {
        const paid = payment.payment || payment;
        const paymentDate = new Date(paid.date_last_updated || payment.last_modified || paid.date_approved || "");
        if (!Number.isNaN(paymentDate.getTime()) && (!subscription.lastPaymentAt || paymentDate >= subscription.lastPaymentAt)) {
          const status = String(paid.status);
          if (["rejected", "cancelled", "refunded", "charged_back"].includes(status) && subscription.status === "active") {
            await Subscription.updateOne({ _id: subscription._id }, { $set: { status: "past_due", lastPaymentAt: paymentDate } }, { session });
          } else if (status === "approved") {
            const planPrice = Number(provider.auto_recurring?.transaction_amount);
            const priceMatches = paid.currency_id === "MXN" && Math.round(Number(paid.transaction_amount) * 100) === Math.round(planPrice * 100);
            await Subscription.updateOne({ _id: subscription._id }, { $set: {
              ...(priceMatches && provider.status === "authorized" ? {status:"active",lastPaymentAt:paymentDate} : {reconciliationNeeded:true})
            } }, { session });
          } else {
            await Subscription.updateOne({ _id: subscription._id }, { $set: { reconciliationNeeded: true } }, { session });
          }
          await writeAudit({ organizationId: String(subscription.organizationId), action: "subscription.payment.reconciled", entityType: "Subscription", entityId: String(provider.id), metadata: { eventId, paymentId: String(payment.id), providerStatus: status } }, session);
        }
      }
      await WebhookEvent.updateOne({ _id: event._id, processedAt: null }, { $set: { processedAt: new Date() } }, { session });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "BILLING_RECONCILIATION_RETRY" }, { status: 503 });
  }
}
