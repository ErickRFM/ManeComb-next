import { describe, expect, it } from "vitest";
import { transitionJourney } from "@/src/core/domain/journey-lifecycle";
describe("journey lifecycle",()=>{
  it("moves through ready running paused and finished",()=>{
    expect(transitionJourney("ASSIGNED","ready")).toBe("READY");
    expect(transitionJourney("READY","start")).toBe("RUNNING");
    expect(transitionJourney("RUNNING","pause")).toBe("PAUSED");
    expect(transitionJourney("PAUSED","resume")).toBe("RUNNING");
    expect(transitionJourney("RUNNING","finish")).toBe("FINISHED");
  });
  it("rejects invalid terminal transitions",()=>expect(()=>transitionJourney("FINISHED","start")).toThrow());
});
