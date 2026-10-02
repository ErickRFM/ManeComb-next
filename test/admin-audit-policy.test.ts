import { describe, expect, it } from "vitest";
import { inferAuditCategory, sanitizeAuditMetadata } from "@/src/core/platform/audit-policy";

describe("admin audit policy",()=>{
  it("redacts sensitive keys recursively",()=>{
    expect(sanitizeAuditMetadata({
      token:"abc",
      nested:{passwordHash:"hash",safe:"ok"},
      authorization:"Bearer secret",
      list:[{apiKey:"key",value:2}]
    })).toEqual({
      token:"[REDACTED]",
      nested:{passwordHash:"[REDACTED]",safe:"ok"},
      authorization:"[REDACTED]",
      list:[{apiKey:"[REDACTED]",value:2}]
    });
  });

  it("classifies common platform actions",()=>{
    expect(inferAuditCategory("manual_payment.approved")).toBe("billing");
    expect(inferAuditCategory("auth.mfa_enabled")).toBe("security");
    expect(inferAuditCategory("organization.update")).toBe("organization");
    expect(inferAuditCategory("app_release.android.update")).toBe("release");
  });
});
