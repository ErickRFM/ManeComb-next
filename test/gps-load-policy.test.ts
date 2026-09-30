import { expect, it } from "vitest";
import { assertLoadTarget, summarizeLoad } from "../scripts/load/socket-gps";
it("fails when acknowledgments are missing, even if every received acknowledgment succeeded",()=>{
  const result=summarizeLoad({requestedClients:500,connectedClients:500,connectionFailures:0,sent:1000,acknowledgedOk:999,acknowledgedErrors:0,timedOut:1,latencies:[2,5,10]});
  expect(result.failed).toBe(true);expect(result.missingAcknowledgments).toBe(1);
});
it("cannot hide connection shortfall behind good latency",()=>{
  expect(summarizeLoad({requestedClients:500,connectedClients:499,connectionFailures:1,sent:100,acknowledgedOk:100,acknowledgedErrors:0,timedOut:0,latencies:[5]}).failed).toBe(true);
});
it("requires explicit HTTPS staging intent for remote load and rejects credential-bearing targets",()=>{
  expect(()=>assertLoadTarget("https://production.invalid")).toThrow();
  expect(()=>assertLoadTarget("https://user:secret@staging.invalid",true)).toThrow();
  expect(assertLoadTarget("https://staging.invalid",true)).toBe("https://staging.invalid");
});
