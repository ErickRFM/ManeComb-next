import mongoose from "mongoose";
import { createHmac, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { connectDb } from "@/src/lib/db";
import { createSessionForUser } from "@/src/lib/auth";
import { Organization } from "@/src/core/models/Organization";
import { User } from "@/src/core/models/User";
import { Subscription } from "@/src/core/models/Subscription";
import { CheckoutIdempotency } from "@/src/core/models/CheckoutIdempotency";
import { WebhookEvent } from "@/src/core/models/WebhookEvent";
import { ManualPayment } from "@/src/core/models/ManualPayment";
import { AuditLog } from "@/src/core/models/AuditLog";
import { getCommercialPlan } from "@/src/core/domain/commercial-plans";
import { requireIntegrationDatabase } from "../support/integration-database";
const faults = vi.hoisted(() => ({ audit: false }));
vi.mock("@/src/core/services/audit", async importOriginal => {
  const actual = await importOriginal<typeof import("@/src/core/services/audit")>();
  return { writeAudit: (...args: Parameters<typeof actual.writeAudit>) => {
    if (faults.audit) throw new Error("QA audit failure");
    return actual.writeAudit(...args);
  } };
});
import { POST as webhook } from "@/app/api/webhooks/mercadopago/route";
import { PATCH as reviewPayment } from "@/app/api/admin/manual-payments/[paymentId]/route";
import { POST as checkout } from "@/app/api/commercial/checkout/route";
import { PATCH as changeSubscription } from "@/app/api/account/subscription/route";

let ownedDatabase = "";
let org: any;
let provider: any;
let ownerToken = "";
let adminToken = "";
let adminUser: any;
const secret = "qa-webhook-secret";
const plan = getCommercialPlan("fleet-2")!;
const request = (eventId = randomUUID(), timestamp = String(Date.now())) => {
  const requestId = eventId;
  const signature = createHmac("sha256", secret).update(`id:provider-current;request-id:${requestId};ts:${timestamp};`).digest("hex");
  return new Request("http://localhost/api/webhooks/mercadopago?data.id=provider-current", { method: "POST", headers: { "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${signature}`, "content-type": "application/json" }, body: JSON.stringify({ id: eventId, type: "subscription_preapproval", data: { id: "provider-current" } }) });
};

beforeAll(async () => {
  const expected = requireIntegrationDatabase(process.env.MONGODB_URI);
  await connectDb();
  if (mongoose.connection.name !== expected) throw new Error("Billing QA database mismatch");
  ownedDatabase = expected;
  await mongoose.connection.db?.dropDatabase();
  await Promise.all([CheckoutIdempotency.init(), WebhookEvent.init(), Subscription.init(), ManualPayment.init()]);
});
beforeEach(async () => {
  faults.audit = false;
  vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "TEST-qa-only");
  vi.stubEnv("MERCADO_PAGO_WEBHOOK_SECRET", secret);
  const stamp = randomUUID();
  org = await Organization.create({ name: "Billing QA", slug: stamp, planCode: "fleet-2" });
  const owner = await User.create({ organizationId: org._id, name: "Owner", email: stamp + "@example.invalid", passwordHash: "x", roles: ["owner"], channel: "company_portal" });
  const admin = await User.create({ name: "Admin", email: "admin-" + stamp + "@example.invalid", passwordHash: "x", roles: ["admin"], channel: "platform_admin" });
  ownerToken = (await createSessionForUser(owner)).token;
  adminToken = (await createSessionForUser(admin, { mfaVerified: true })).token;
  adminUser = admin;
  provider = { id: "provider-current", status: "authorized", version: 2, external_reference: `manecomb|${org._id}|fleet-2`, last_modified: "2026-09-30T00:00:00Z", next_payment_date: "2026-10-01T00:00:00Z", auto_recurring: { frequency: 1, frequency_type: "months", currency_id: "MXN", transaction_amount: plan.monthlyMxn } };
  await CheckoutIdempotency.create({ organizationId: org._id, key: stamp, planCode: "fleet-2", providerSubscriptionId: provider.id, status: "pending" });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(provider)));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); faults.audit = false; });
afterAll(async () => {
  if (ownedDatabase && mongoose.connection.name === ownedDatabase) await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

it("correlates the exact provider attempt and leaves historical checkouts untouched", async () => {
  const historical = await CheckoutIdempotency.create({ organizationId: org._id, key: "history", planCode: "fleet-2", providerSubscriptionId: "provider-historical", status: "cancelled" });
  expect((await webhook(request())).status).toBe(200);
  const saved = await CheckoutIdempotency.findById(historical._id);
  expect(saved!.providerSubscriptionId).toBe("provider-historical");
  expect(saved!.status).toBe("cancelled");
});
it("preserves a valid subscription on unknown provider status and marks reconciliation needed", async () => {
  await Subscription.create({ organizationId: org._id, planCode: "fleet-2", provider: "mercadopago", providerSubscriptionId: provider.id, status: "active" });
  provider.status = "future-status";
  expect((await webhook(request())).status).toBe(200);
  const saved = await Subscription.findOne({ organizationId: org._id });
  expect(saved!.status).toBe("active");
  expect(saved!.reconciliationNeeded).toBe(true);
});
it("does not treat next_payment_date as a paid entitlement expiration", async () => {
  expect((await webhook(request())).status).toBe(200);
  const saved = await Subscription.findOne({ organizationId: org._id });
  expect(saved!.currentPeriodEnd).toBeUndefined();
  expect(saved!.nextPaymentAt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
});
it("rejects stale signed replay and unsigned requests", async () => {
  expect((await webhook(request(randomUUID(), String(Date.now() - 600_000)))).status).toBe(401);
  const unsigned = new Request(request());
  unsigned.headers.delete("x-signature");
  expect((await webhook(unsigned)).status).toBe(401);
});
it.each([400, 500])("returns retryable reconciliation failure on provider HTTP %s without activating", async status => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "authorized" }, { status })));
  expect((await webhook(request())).status).toBe(502);
  expect(await Subscription.countDocuments({ organizationId: org._id })).toBe(0);
});
it("handles provider timeout without accepting the event", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("timeout", "TimeoutError"); }));
  expect((await webhook(request())).status).toBe(502);
  expect(await Subscription.countDocuments({ organizationId: org._id })).toBe(0);
});
it("atomically rolls back subscription and checkout when audit fails, then recovers the same event", async () => {
  const eventId = randomUUID();
  faults.audit = true;
  expect((await webhook(request(eventId))).status).toBe(503);
  expect(await Subscription.countDocuments({ organizationId: org._id })).toBe(0);
  expect((await CheckoutIdempotency.findOne({ organizationId: org._id }))!.status).toBe("pending");
  expect((await WebhookEvent.findOne({ eventId }))!.processedAt).toBeUndefined();
  faults.audit = false;
  expect((await webhook(request(eventId))).status).toBe(200);
  expect((await webhook(request(eventId))).status).toBe(200);
  expect(await AuditLog.countDocuments({ organizationId: org._id, action: "subscription.mercadopago.authorized" })).toBe(1);
});
it("cannot regress a newer provider snapshot when an old webhook arrives", async () => {
  await Subscription.create({ organizationId: org._id, planCode: "fleet-2", provider: "mercadopago", providerSubscriptionId: provider.id, status: "active", providerVersion: 3, providerLastModifiedAt: new Date("2026-09-30T01:00:00Z") });
  provider.status = "paused";
  expect((await webhook(request())).status).toBe(200);
  expect((await Subscription.findOne({ organizationId: org._id }))!.status).toBe("active");
});
it("rolls back a manual approval if its audit fails, then approves once with a calendar month", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2025-01-31T12:30:00Z"));
  adminToken = (await createSessionForUser(adminUser, { mfaVerified: true })).token;
  const payment = await ManualPayment.create({ organizationId: org._id, planCode: plan.code, amountMxn: plan.monthlyMxn, expectedAmountMxn: plan.monthlyMxn, receiptUrl: "https://example.invalid/receipt", receiptPublicId: "qa-receipt", receiptResourceType: "image", receiptBytes: 1024, idempotencyKey: randomUUID() });
  const review = () => reviewPayment(new Request("http://localhost/api/admin/manual-payments/" + payment._id, { method: "PATCH", headers: { authorization: "Bearer " + adminToken }, body: JSON.stringify({ status: "approved" }) }), { params: Promise.resolve({ paymentId: String(payment._id) }) });
  try {
    faults.audit = true;
    expect((await review()).status).toBe(400);
    expect((await ManualPayment.findById(payment._id))!.status).toBe("pending");
    expect(await Subscription.countDocuments({ organizationId: org._id })).toBe(0);
    faults.audit = false;
    expect((await review()).status).toBe(200);
    expect((await review()).status).toBe(200);
    const subscription = await Subscription.findOne({ organizationId: org._id });
    expect(subscription!.currentPeriodEnd.toISOString()).toBe("2025-02-28T12:30:00.000Z");
    expect(await AuditLog.countDocuments({ entityId: String(payment._id) })).toBe(1);
  } finally { vi.useRealTimers(); }
});
it("reuses a pending checkout even when the browser supplies a new idempotency key", async () => {
  await CheckoutIdempotency.deleteMany({ organizationId: org._id });
  const keys: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url, options: any) => {
    keys.push(options.headers["X-Idempotency-Key"]);
    return Response.json({ id: "provider-created", init_point: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_id=provider-created" });
  }));
  const start = () => checkout(new Request("http://localhost/api/commercial/checkout", { method: "POST", headers: { authorization: "Bearer " + ownerToken }, body: JSON.stringify({ planId: plan.code, idempotencyKey: randomUUID() }) }));
  const first = await start(); const second = await start();
  expect(first.status).toBe(200); expect(second.status).toBe(200);
  expect((await first.json()).checkoutId).toBe((await second.json()).checkoutId);
  expect(keys).toHaveLength(1);
});

it("cancels at the provider before reconciling the local subscription", async () => {
  await Subscription.create({ organizationId: org._id, planCode: plan.code, provider: "mercadopago", providerSubscriptionId: provider.id, status: "active" });
  const methods: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url, options: any) => {
    methods.push(options.method || "GET");
    if (options.method === "PUT") {
      expect((await Subscription.findOne({ organizationId: org._id }))!.status).toBe("active");
      provider.status = "cancelled"; provider.version = 3;
    }
    return Response.json(provider);
  }));
  const response = await changeSubscription(new Request("http://localhost/api/account/subscription", { method: "PATCH", headers: { authorization: "Bearer " + ownerToken }, body: JSON.stringify({ action: "cancel" }) }));
  expect(response.status).toBe(200);
  expect(methods).toEqual(["GET", "PUT", "GET"]);
  expect((await Subscription.findOne({ organizationId: org._id }))!.status).toBe("cancelled");
});
it("leaves local billing unchanged when the provider rejects a plan change", async () => {
  await Subscription.create({ organizationId: org._id, planCode: plan.code, provider: "mercadopago", providerSubscriptionId: provider.id, status: "active" });
  vi.stubGlobal("fetch", vi.fn(async (_url, options: any) => options.method === "PUT" ? Response.json({}, { status: 500 }) : Response.json(provider)));
  const response = await changeSubscription(new Request("http://localhost/api/account/subscription", { method: "PATCH", headers: { authorization: "Bearer " + ownerToken }, body: JSON.stringify({ action: "changePlan", planCode: "fleet-4" }) }));
  expect(response.status).toBe(502);
  expect((await Subscription.findOne({ organizationId: org._id }))!.planCode).toBe("fleet-2");
});
it("takes plan amount and capacity from the server and waits for confirmed provider state", async () => {
  await Subscription.create({ organizationId: org._id, planCode: plan.code, provider: "mercadopago", providerSubscriptionId: provider.id, status: "active" });
  vi.stubGlobal("fetch", vi.fn(async (_url, options: any) => {
    if (options.method === "PUT") {
      const body = JSON.parse(options.body);
      expect(body.auto_recurring.transaction_amount).toBe(getCommercialPlan("fleet-4")!.monthlyMxn);
      expect((await Subscription.findOne({ organizationId: org._id }))!.planCode).toBe("fleet-2");
      provider = { ...provider, ...body, version: 3 };
    }
    return Response.json(provider);
  }));
  const response = await changeSubscription(new Request("http://localhost/api/account/subscription", { method: "PATCH", headers: { authorization: "Bearer " + ownerToken }, body: JSON.stringify({ action: "changePlan", planCode: "fleet-4", amountMxn: 1 }) }));
  expect(response.status).toBe(200);
  const saved = await Subscription.findOne({ organizationId: org._id });
  expect(saved!.planCode).toBe("fleet-4"); expect(saved!.vehicleLimit).toBe(4);
});
