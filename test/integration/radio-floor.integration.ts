import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRedis } from "@/src/lib/redis";
import { acquireRadioFloor, refreshRadioFloor, releaseRadioFloor } from "@/src/realtime/radio-floor";

describe("distributed radio floor",()=>{
  beforeAll(async()=>{
    const redis=await ensureRedis();
    if(!redis)throw new Error("Redis is required for integration tests");
    await redis.flushdb();
  });

  afterAll(async()=>{
    const redis=await ensureRedis();
    await redis?.flushdb();
    await redis?.quit();
  });

  it("allows exactly one floor owner and releases safely",async()=>{
    expect(await acquireRadioFloor("org-a","general","socket-a:user-a")).toBe(true);
    expect(await acquireRadioFloor("org-a","general","socket-b:user-b")).toBe(false);
    expect(await refreshRadioFloor("org-a","general","socket-a:user-a")).toBe(true);
    expect(await refreshRadioFloor("org-a","general","socket-b:user-b")).toBe(false);

    await releaseRadioFloor("org-a","general","socket-b:user-b");
    expect(await acquireRadioFloor("org-a","general","socket-b:user-b")).toBe(false);

    await releaseRadioFloor("org-a","general","socket-a:user-a");
    expect(await acquireRadioFloor("org-a","general","socket-b:user-b")).toBe(true);
  });

  it("isolates independent channels",async()=>{
    expect(await acquireRadioFloor("org-a","canal-1","a")).toBe(true);
    expect(await acquireRadioFloor("org-a","canal-2","b")).toBe(true);
    expect(await acquireRadioFloor("org-b","canal-1","c")).toBe(true);
  });
});
