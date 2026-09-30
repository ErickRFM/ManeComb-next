import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMercadoPagoWebhook(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}) {
  if (!input.signature || !input.requestId || !input.dataId) return false;
  const parts = Object.fromEntries(input.signature.split(",").map((part) => {
    const [key, value] = part.trim().split("=");
    return [key, value];
  }));
  if (!parts.ts || !parts.v1) return false;
  if (!/^\d{10,13}$/.test(parts.ts) || !/^[a-fA-F0-9]{64}$/.test(parts.v1)) return false;
  const timestamp = Number(parts.ts) * (parts.ts.length === 10 ? 1000 : 1);
  if (Math.abs(Date.now() - timestamp) > 5 * 60_000) return false;
  const manifest = "id:" + input.dataId.toLowerCase() + ";request-id:" + input.requestId + ";ts:" + parts.ts + ";";
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
