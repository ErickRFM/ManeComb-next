import { Queue } from "bullmq";
import { ensureRedis } from "@/src/lib/redis";
import { communicationQueueName, communicationQueuePrefix } from "@/src/lib/runtime-namespace";

let queue: Queue | null = null;

export async function getCommunicationQueue() {
  const redis = await ensureRedis();
  if (!redis) throw new Error("REDIS_URL is not configured");
  if (!queue) queue = new Queue(communicationQueueName(), { connection: redis, prefix: communicationQueuePrefix() });
  return queue;
}
