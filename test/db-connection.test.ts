import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const globalCache = globalThis as typeof globalThis & { __manecombMongoose?: unknown };

beforeEach(() => {
  vi.resetModules();
  delete globalCache.__manecombMongoose;
  vi.stubEnv("MONGODB_URI", "mongodb://diagnostic.invalid/test");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete globalCache.__manecombMongoose;
});

describe("database connection recovery", () => {
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
