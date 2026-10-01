import {beforeEach,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({verify:vi.fn(),revoke:vi.fn(),devices:vi.fn(),disconnect:vi.fn()}));
vi.mock("@/src/lib/auth",()=>({extractRequestToken:()=>"qa-token",verifySessionToken:mock.verify,revokeSession:mock.revoke,SESSION_COOKIE:"manecomb_session"}));
vi.mock("@/src/core/models/DeviceSession",()=>({DeviceSession:{updateMany:mock.devices}}));
vi.mock("@/src/realtime/runtime",()=>({disconnectSessionSockets:mock.disconnect}));
import {POST} from "@/app/api/auth/logout/route";
beforeEach(()=>{vi.resetAllMocks();mock.verify.mockResolvedValue({jti:"session-a",sub:"driver-a",organizationId:"org-a",channel:"mobile_operations"});mock.revoke.mockResolvedValue(undefined);mock.devices.mockResolvedValue(undefined);mock.disconnect.mockResolvedValue(undefined)});
it("does not confirm logout or discard the cookie when server revocation fails",async()=>{
  mock.revoke.mockRejectedValue(new Error("QA database unavailable"));
  const response=await POST(new Request("http://localhost/api/auth/logout",{method:"POST"}));
  expect(response.status).toBe(503);expect(response.headers.get("set-cookie")).toBeNull();
});
it("revokes mobile GPS credentials and the exact realtime session before confirming logout",async()=>{
  const response=await POST(new Request("http://localhost/api/auth/logout",{method:"POST"}));expect(response.status).toBe(200);
  expect(mock.devices).toHaveBeenCalledWith({userId:"driver-a",organizationId:"org-a",revokedAt:null},{$set:{revokedAt:expect.any(Date)}});
  expect(mock.disconnect).toHaveBeenCalledWith("driver-a","session-a");expect(response.headers.get("set-cookie")).toContain("manecomb_session=");
});
it("clears an invalid or expired cookie without pretending to revoke an active session",async()=>{
  mock.verify.mockRejectedValue(new Error("UNAUTHORIZED"));const response=await POST(new Request("http://localhost/api/auth/logout",{method:"POST"}));
  expect(response.status).toBe(200);expect(mock.revoke).not.toHaveBeenCalled();expect(mock.devices).not.toHaveBeenCalled();
});
