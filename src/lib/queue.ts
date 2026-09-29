import { Queue } from "bullmq";
import { ensureRedis } from "@/src/lib/redis";

let queue: Queue | null = null;

export async function getCommunicationQueue() {
  const redis = await ensureRedis();
  if (!redis) throw new Error("REDIS_URL is not configured");
  if (!queue) queue = new Queue("manecomb-communication", { connection: redis });
  return queue;
}
