import mongoose, { type ClientSession } from "mongoose";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { Subscription } from "@/src/core/models/Subscription";
import { CheckoutIdempotency } from "@/src/core/models/CheckoutIdempotency";
import { Organization } from "@/src/core/models/Organization";
import { writeAudit } from "@/src/core/services/audit";
import { getEnv } from "@/src/lib/env";

export function addCalendarMonth(value: Date) {
  const result = new Date(value);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function mapPreapprovalStatus(status: string) {
  switch (status) {
    case "authorized": return "active" as const;
    case "paused": return "paused" as const;
    case "cancelled": return "cancelled" as const;
    case "pending": return null;
    default: return undefined;
  }
}

export async function mercadoPagoRequest(path: string, init: RequestInit = {}) {
  const token = getEnv().mercadoPagoAccessToken;
  if (!token) throw new Error("BILLING_PROVIDER_UNAVAILABLE");
  try {
    const response = await fetch("https://api.mercadopago.com" + path, {
      ...init, headers: { "content-type": "application/json", ...init.headers, authorization: "Bearer " + token },
      redirect: "error", signal: AbortSignal.timeout(10_000), cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || !data || typeof data !== "object") throw new Error();
    return data as Record<string, any>;
  } catch { throw new Error("BILLING_PROVIDER_UNAVAILABLE"); }
}

function providerDate(value: unknown) {
  if (typeof value !== "string") return undefined;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? undefined : result;
}

// All writes and the audit share the caller's transaction; provider I/O stays outside it.
export async function reconcilePreapproval(provider: Record<string, any>, session: ClientSession, eventId: string) {
  const parts = String(provider.external_reference || "").split("|");
  const [prefix, organizationId, planCode] = parts;
  const plan = getCommercialPlan(planCode);
  if (parts.length !== 3 || prefix !== "manecomb" || !mongoose.isValidObjectId(organizationId) || !plan || !provider.id) throw new Error("BILLING_CORRELATION_INVALID");
  const providerId = String(provider.id);
  const checkout = await CheckoutIdempotency.findOne({ organizationId, providerSubscriptionId: providerId }).session(session);
  const current = await Subscription.findOne({ organizationId }).session(session);
  if (!checkout && current?.providerSubscriptionId !== providerId) throw new Error("BILLING_CORRELATION_INVALID");
  const version = Number.isInteger(provider.version) ? provider.version : undefined;
  const modified = providerDate(provider.last_modified);
  const stale = current?.providerSubscriptionId === providerId && (
    (version !== undefined && current.providerVersion !== undefined && version < current.providerVersion) ||
    (modified && current.providerLastModifiedAt && modified < current.providerLastModifiedAt)
  );
  // An old checkout must never replace a newer subscription, including a manual one.
  const replaced = current && current.providerSubscriptionId !== providerId && (
    current.provider === "manual" || current.status !== "cancelled"
  );
  if (stale || replaced) {
    await writeAudit({ organizationId, action: "subscription.reconciliation.ignored", entityType: "Subscription", entityId: providerId, metadata: { eventId, reason: stale ? "stale_snapshot" : "superseded_attempt" } }, session);
    return current;
  }
  const status = mapPreapprovalStatus(String(provider.status));
  const recurring = provider.auto_recurring;
  const validPrice = recurring?.currency_id === "MXN" && Number(recurring.frequency) === 1 && recurring.frequency_type === "months" && Math.round(Number(recurring.transaction_amount) * 100) === Math.round(plan.monthlyMxn * 100);
  if (status === undefined || (status === "active" && !validPrice)) {
    if (current) await Subscription.updateOne({ _id: current._id }, { $set: { reconciliationNeeded: true } }, { session });
    await writeAudit({ organizationId, action: "subscription.reconciliation.required", entityType: "Subscription", entityId: providerId, metadata: { eventId, reason: status === undefined ? "unknown_status" : "price_mismatch", providerStatus: String(provider.status).slice(0, 80) } }, session);
    return current;
  }
  // Pending authorization grants no entitlement. Keep the last valid state unchanged.
  if (status === null) {
    await writeAudit({ organizationId, action: "subscription.mercadopago.pending", entityType: "Subscription", entityId: providerId, metadata: { eventId, checkoutId: checkout ? String(checkout._id) : null } }, session);
    return current;
  }
  const effectiveStatus = status === "active" && current?.status === "past_due" && current.providerSubscriptionId === providerId ? "past_due" : status;
  const update: Record<string, any> = { planCode: plan.code, status: effectiveStatus, provider: "mercadopago", providerSubscriptionId: providerId, vehicleLimit: plan.units, reconciliationNeeded: false };
  if (version !== undefined) update.providerVersion = version;
  if (modified) update.providerLastModifiedAt = modified;
  const next = providerDate(provider.next_payment_date);
  if (next) update.nextPaymentAt = next;
  const subscription = await Subscription.findOneAndUpdate({ organizationId }, { $set: update }, { session, upsert: true, new: true, setDefaultsOnInsert: true });
  await CheckoutIdempotency.updateOne({ organizationId, providerSubscriptionId: providerId }, { $set: { planCode: plan.code, status: status === "active" ? "active" : status === "cancelled" ? "cancelled" : "pending", activeIntent: false } }, { session });
  await Organization.updateOne({ _id: organizationId }, { $set: { planCode: plan.code } }, { session });
  await writeAudit({ organizationId, action: "subscription.mercadopago." + provider.status, entityType: "Subscription", entityId: providerId, metadata: { eventId, planCode: plan.code, status, checkoutId: checkout ? String(checkout._id) : null } }, session);
  return subscription;
}
