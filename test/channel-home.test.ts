import { expect, it } from "vitest";
import { channelHome } from "@/src/lib/channel-home";

it("lands company sessions on the operational map",()=>{
  expect(channelHome("company_portal")).toBe("/portal/monitoreo");
});
it("keeps installed operation and global admin in their own surfaces",()=>{
  expect(channelHome("mobile_operations")).toBe("/operacion");
  expect(channelHome("platform_admin")).toBe("/admin/salud");
});
it("rejects missing or unexpected channels instead of entering another surface",()=>{
  expect(()=>channelHome(undefined)).toThrow("SESSION_CHANNEL_INVALID");
  expect(()=>channelHome("unknown")).toThrow("SESSION_CHANNEL_INVALID");
});
