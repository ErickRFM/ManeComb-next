import { describe, expect, it } from "vitest";
import { generateTotpCode } from "@/src/lib/mfa";

describe("TOTP", () => {
  it("matches RFC 6238 SHA1 vector", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(generateTotpCode(secret, 59_000, 8)).toBe("94287082");
  });
});
