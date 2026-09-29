import { describe, expect, it } from "vitest";
import { hasPermission } from "@/src/core/domain/permissions";

describe("RBAC",()=>{
  it("keeps viewer read-only",()=>{
    expect(hasPermission(["viewer"],"view_analytics")).toBe(true);
    expect(hasPermission(["viewer"],"manage_vehicles")).toBe(false);
    expect(hasPermission(["viewer"],"manage_billing")).toBe(false);
    expect(hasPermission(["viewer"],"access_chat")).toBe(false);
  });

  it("allows driver communications but not company administration",()=>{
    expect(hasPermission(["driver"],"access_chat")).toBe(true);
    expect(hasPermission(["driver"],"access_radio")).toBe(true);
    expect(hasPermission(["driver"],"access_rtc")).toBe(true);
    expect(hasPermission(["driver"],"manage_users")).toBe(false);
    expect(hasPermission(["driver"],"manage_vehicles")).toBe(false);
  });

  it("gives owner full operational authority",()=>{
    for(const permission of [
      "manage_users","manage_billing","manage_vehicles","view_analytics",
      "access_rtc","access_chat","access_radio","manage_routes",
      "manage_documents","manage_incidents"
    ] as const){
      expect(hasPermission(["owner"],permission)).toBe(true);
    }
  });
});
