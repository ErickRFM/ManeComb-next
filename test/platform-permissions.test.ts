import { describe, expect, it } from "vitest";
import { effectivePlatformRoles, hasPlatformPermission } from "@/src/core/platform/permissions";

const session=(platformRoles:string[],roles:string[]=[]):any=>({
  sub:"platform-user",
  organizationId:null,
  roles,
  platformRoles,
  channel:"platform_admin",
  jti:"session",
  mfaVerified:true
});

describe("platform RBAC",()=>{
  it("gives owner full platform authority",()=>{
    const owner=session(["platform_owner"]);
    for(const permission of [
      "platform.organizations.read",
      "platform.organizations.write",
      "platform.billing.read",
      "platform.billing.review",
      "platform.audit.read",
      "platform.system.read",
      "platform.releases.read",
      "platform.releases.write",
      "platform.users.read",
      "platform.users.manage",
      "platform.sessions.read",
      "platform.sessions.revoke"
    ] as const)expect(hasPlatformPermission(owner,permission)).toBe(true);
  });

  it("keeps finance out of release and user governance",()=>{
    const finance=session(["platform_finance"]);
    expect(hasPlatformPermission(finance,"platform.billing.review")).toBe(true);
    expect(hasPlatformPermission(finance,"platform.releases.write")).toBe(false);
    expect(hasPlatformPermission(finance,"platform.users.manage")).toBe(false);
  });

  it("keeps viewer read-only",()=>{
    const viewer=session(["platform_viewer"]);
    expect(hasPlatformPermission(viewer,"platform.organizations.read")).toBe(true);
    expect(hasPlatformPermission(viewer,"platform.billing.read")).toBe(true);
    expect(hasPlatformPermission(viewer,"platform.organizations.write")).toBe(false);
    expect(hasPlatformPermission(viewer,"platform.billing.review")).toBe(false);
    expect(hasPlatformPermission(viewer,"platform.releases.write")).toBe(false);
  });

  it("supports legacy platform owner only as transitional compatibility",()=>{
    expect(effectivePlatformRoles({channel:"platform_admin",roles:["owner"],platformRoles:[]})).toEqual(["platform_owner"]);
    expect(effectivePlatformRoles({channel:"company_portal",roles:["owner"],platformRoles:[]})).toEqual([]);
  });
});
