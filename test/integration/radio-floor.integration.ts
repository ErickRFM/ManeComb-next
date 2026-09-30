import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ensureRedis } from "@/src/lib/redis";
import { acquireRadioFloor, refreshRadioFloor, releaseRadioFloor } from "@/src/realtime/radio-floor";

describe("distributed radio floor",()=>{
  const orgA="qa-"+randomUUID();
  const orgB="qa-"+randomUUID();
  beforeAll(async()=>{
    const redis=await ensureRedis();
    if(!redis)throw new Error("Redis is required for integration tests");
    await redis.ping();
  });

  afterAll(async()=>{
    const redis=await ensureRedis();
    await releaseRadioFloor(orgA,"general","socket-b:user-b");
    await releaseRadioFloor(orgA,"general","socket-a:user-a");
    await releaseRadioFloor(orgA,"canal-1","a");
    await releaseRadioFloor(orgA,"canal-2","b");
    await releaseRadioFloor(orgB,"canal-1","c");
    await redis?.quit();
  });

  it("allows exactly one floor owner and releases safely",async()=>{
    expect(await acquireRadioFloor(orgA,"general","socket-a:user-a")).toBe(true);
    expect(await acquireRadioFloor(orgA,"general","socket-b:user-b")).toBe(false);
    expect(await refreshRadioFloor(orgA,"general","socket-a:user-a")).toBe(true);
    expect(await refreshRadioFloor(orgA,"general","socket-b:user-b")).toBe(false);

    await releaseRadioFloor(orgA,"general","socket-b:user-b");
    expect(await acquireRadioFloor(orgA,"general","socket-b:user-b")).toBe(false);

    await releaseRadioFloor(orgA,"general","socket-a:user-a");
    expect(await acquireRadioFloor(orgA,"general","socket-b:user-b")).toBe(true);
  });

  it("isolates independent channels",async()=>{
    expect(await acquireRadioFloor(orgA,"canal-1","a")).toBe(true);
    expect(await acquireRadioFloor(orgA,"canal-2","b")).toBe(true);
    expect(await acquireRadioFloor(orgB,"canal-1","c")).toBe(true);
  });
});
