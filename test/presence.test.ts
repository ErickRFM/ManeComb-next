import { describe, expect, it } from "vitest";

function isFresh(input:{presenceJoined?:boolean;lastPresenceHeartbeatAt?:number},now:number,timeoutMs=55_000){
  const timestamp=Number(input.lastPresenceHeartbeatAt||0);
  return input.presenceJoined===true&&timestamp>0&&now-timestamp<=timeoutMs;
}

describe("presence lease",()=>{
  it("expires after 55 seconds",()=>{
    expect(isFresh({presenceJoined:true,lastPresenceHeartbeatAt:1_000},55_999)).toBe(true);
    expect(isFresh({presenceJoined:true,lastPresenceHeartbeatAt:1_000},56_001)).toBe(false);
  });

  it("never treats an unjoined socket as present",()=>{
    expect(isFresh({presenceJoined:false,lastPresenceHeartbeatAt:50_000},50_001)).toBe(false);
    expect(isFresh({lastPresenceHeartbeatAt:50_000},50_001)).toBe(false);
  });
});
