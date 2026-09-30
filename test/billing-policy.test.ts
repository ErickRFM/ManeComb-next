import { expect, it } from "vitest";
import { addCalendarMonth, mapPreapprovalStatus } from "@/src/core/services/billing";
import { verifyMercadoPagoWebhook } from "@/src/core/services/mercadopago";
import { createHmac } from "node:crypto";

it("clamps a calendar month at month end without adding thirty days", () => {
  expect(addCalendarMonth(new Date("2024-01-31T12:30:00Z")).toISOString()).toBe("2024-02-29T12:30:00.000Z");
  expect(addCalendarMonth(new Date("2025-01-31T12:30:00Z")).toISOString()).toBe("2025-02-28T12:30:00.000Z");
});
it("verifies fresh signatures and denies missing fields, invalid signatures and stale replay", () => {
  const ts = String(Date.now());
  const input = { requestId:"request",dataId:"ABC",secret:"qa-secret",signature:"" };
  const signature = createHmac("sha256", input.secret).update(`id:abc;request-id:request;ts:${ts};`).digest("hex");
  input.signature = `ts=${ts},v1=${signature}`;
  expect(verifyMercadoPagoWebhook(input)).toBe(true);
  expect(verifyMercadoPagoWebhook({...input,signature:null})).toBe(false);
  expect(verifyMercadoPagoWebhook({...input,requestId:null})).toBe(false);
  expect(verifyMercadoPagoWebhook({...input,dataId:null})).toBe(false);
  expect(verifyMercadoPagoWebhook({...input,secret:"wrong"})).toBe(false);
  expect(verifyMercadoPagoWebhook({...input,signature:input.signature.replace(ts,"0")})).toBe(false);
});
it("maps only documented preapproval states and preserves unknown states", () => {
  expect(mapPreapprovalStatus("authorized")).toBe("active");
  expect(mapPreapprovalStatus("paused")).toBe("paused");
  expect(mapPreapprovalStatus("cancelled")).toBe("cancelled");
  expect(mapPreapprovalStatus("pending")).toBe(null);
  expect(mapPreapprovalStatus("new-provider-status")).toBe(undefined);
});
