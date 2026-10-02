export type AuditCategory = "security" | "billing" | "organization" | "release" | "system" | "operations";

const SENSITIVE_KEY = /(password|passwd|secret|token|authorization|cookie|credential|api[_-]?key|mfa|mongo.*uri|connection.*string)/i;
const MAX_DEPTH = 6;
const MAX_ARRAY = 100;
const MAX_STRING = 4000;

export function sanitizeAuditMetadata(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > MAX_STRING ? value.slice(0, MAX_STRING) + "…" : value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map(item => sanitizeAuditMetadata(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitizeAuditMetadata(child, depth + 1);
    }
    return output;
  }
  return String(value);
}

export function inferAuditCategory(action: string): AuditCategory {
  const value=action.toLowerCase();
  if(value.includes("payment")||value.includes("subscription")||value.includes("checkout")||value.includes("billing"))return "billing";
  if(value.includes("auth")||value.includes("mfa")||value.includes("session")||value.includes("user")||value.includes("role"))return "security";
  if(value.includes("organization")||value.includes("company"))return "organization";
  if(value.includes("release")||value.includes("version"))return "release";
  if(value.includes("health")||value.includes("system")||value.includes("readiness"))return "system";
  return "operations";
}
