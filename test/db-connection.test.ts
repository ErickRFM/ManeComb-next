import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const globalCache = globalThis as typeof globalThis & { __manecombMongoose?: unknown };

beforeEach(() => {
  vi.resetModules();
  delete globalCache.__manecombMongoose;
  vi.stubEnv("MONGODB_URI", "mongodb://diagnostic.invalid/test");
  vi.stubEnv("MONGODB_MAX_POOL_SIZE", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete globalCache.__manecombMongoose;
});

describe("database connection recovery", () => {
  it("accepts an explicit bounded pool size for measured capacity tuning",async()=>{
    vi.stubEnv("MONGODB_MAX_POOL_SIZE","100");
    const connect=vi.spyOn(mongoose,"connect").mockResolvedValue(mongoose);
    const {connectDb}=await import("@/src/lib/db");await connectDb();
    expect(connect).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({maxPoolSize:100}));
  });
  it("rejects malformed pool configuration before connecting",async()=>{
    vi.stubEnv("MONGODB_MAX_POOL_SIZE","10000");
    const connect=vi.spyOn(mongoose,"connect").mockResolvedValue(mongoose);
    const {connectDb}=await import("@/src/lib/db");
    await expect(connectDb()).rejects.toThrow("MONGODB_MAX_POOL_SIZE_INVALID");
    expect(connect).not.toHaveBeenCalled();
  });
  it("allows a new connection after a transient failure", async () => {
    const failure = new Error("temporary DNS failure");
    vi.spyOn(mongoose, "connect")
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(mongoose);
    const { connectDb } = await import("@/src/lib/db");

    await expect(connectDb()).rejects.toBe(failure);
    await expect(connectDb()).resolves.toBe(mongoose);
  });

  it("shares an in-flight connection and reuses the successful connection", async () => {
    let resolveConnection!: (connection: typeof mongoose) => void;
    const connect = vi.spyOn(mongoose, "connect").mockImplementation(() =>
      new Promise<typeof mongoose>((resolve) => { resolveConnection = resolve; })
    );
    const { connectDb } = await import("@/src/lib/db");

    const first = connectDb();
    const second = connectDb();
    resolveConnection(mongoose);
    await expect(first).resolves.toBe(mongoose);
    await expect(second).resolves.toBe(mongoose);
    await expect(connectDb()).resolves.toBe(mongoose);
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
