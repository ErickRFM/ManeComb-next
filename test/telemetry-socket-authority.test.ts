import { beforeEach,expect,it,vi } from "vitest";
const calls=vi.hoisted(()=>({auth:vi.fn(),ingest:vi.fn(),subscription:vi.fn(),publish:vi.fn()}));
vi.mock("@/src/lib/auth",()=>({assertStoredSessionActive:calls.auth}));
vi.mock("@/src/lib/db",()=>({connectDb:async()=>{}}));
vi.mock("@/src/realtime/socket-rate-limit",()=>({allowSocketEvent:()=>true}));
vi.mock("@/src/core/services/subscription-access",()=>({requireActiveSubscription:calls.subscription}));
vi.mock("@/src/core/services/telemetry",()=>({recordTelemetry:calls.ingest}));
vi.mock("@/src/realtime/services/location-publisher",()=>({publishLocationSnapshot:calls.publish}));
import { registerLocationHandler } from "@/src/realtime/handlers/location.handler";
beforeEach(()=>{vi.resetAllMocks();calls.ingest.mockResolvedValue({vehicleId:"v"});});
it.each(["logout","disabled user","changed tenant or role"])("rejects the next Socket packet after %s without waiting for the watchdog",async()=>{
  calls.auth.mockRejectedValue(new Error("UNAUTHORIZED"));
  let handler:any;
  const socket={data:{session:{organizationId:"org",channel:"mobile_operations",sub:"driver"}},on:(_event:string,fn:any)=>{handler=fn}};
  registerLocationHandler({} as any,socket as any);
  const ack=vi.fn();
  await handler({vehicleId:"v",journeyId:"j",latitude:20,longitude:-99,recordedAt:new Date().toISOString()},ack);
  expect(ack).toHaveBeenCalledWith({ok:false,error:"UNAUTHORIZED"});
  expect(calls.ingest).not.toHaveBeenCalled();expect(calls.publish).not.toHaveBeenCalled();
});
it("still acknowledges an authorized Socket packet after successful ingestion",async()=>{
  calls.auth.mockResolvedValue({});
  let handler:any;
  registerLocationHandler({} as any,{data:{session:{organizationId:"org",channel:"mobile_operations",sub:"driver"}},on:(_event:string,fn:any)=>{handler=fn}} as any);
  const ack=vi.fn();
  await handler({vehicleId:"v",journeyId:"j",latitude:20,longitude:-99,recordedAt:new Date().toISOString()},ack);
  expect(calls.auth).toHaveBeenCalledOnce();expect(calls.ingest).toHaveBeenCalledOnce();
  expect(ack).toHaveBeenCalledWith({ok:true,snapshot:{vehicleId:"v"}});
});
