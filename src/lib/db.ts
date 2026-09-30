import mongoose from "mongoose";
import { getEnv } from "@/src/lib/env";

type Cache = { connection: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalCache = globalThis as typeof globalThis & { __manecombMongoose?: Cache };
const cache = globalCache.__manecombMongoose || { connection: null, promise: null };
globalCache.__manecombMongoose = cache;

export async function connectDb() {
  if (cache.connection) return cache.connection;
  const uri = getEnv().mongodbUri;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  if (!cache.promise) cache.promise = mongoose.connect(uri, { maxPoolSize: 20, serverSelectionTimeoutMS: 5000 });
  const promise = cache.promise;
  try {
    cache.connection = await promise;
    return cache.connection;
  } catch (error) {
    if (cache.promise === promise) cache.promise = null;
    throw error;
  }
}

export async function checkDb() {
  try {
    const db = await connectDb();
    await db.connection.db?.admin().ping();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "database unavailable" };
  }
}
