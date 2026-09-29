import { Worker } from "bullmq";
import { connectDb } from "@/src/lib/db";
import { ensureRedis } from "@/src/lib/redis";
import { getCommunicationQueue } from "@/src/lib/queue";
import { OutboxEvent } from "@/src/core/models/OutboxEvent";
import { sendTransactionalEmail } from "@/src/lib/email";

async function flushOutbox() {
  await connectDb();
  const pending = await OutboxEvent.find({ status: "pending" }).sort({ createdAt: 1 }).limit(25);
  if (!pending.length) return;
  const queue = await getCommunicationQueue();
  for (const event of pending) {
    await queue.add(event.type, { outboxId: String(event._id), payload: event.payload }, { jobId: String(event._id), attempts: 5, backoff: { type: "exponential", delay: 2000 } });
    event.status = "queued";
    await event.save();
  }
}

export async function startCommunicationWorker() {
  const redis = await ensureRedis();
  if (!redis) {
    console.warn("[worker] REDIS_URL missing; worker disabled");
    return null;
  }
  const worker = new Worker("manecomb-communication", async (job) => {
    await connectDb();
    const event = await OutboxEvent.findById(job.data.outboxId);
    if (!event) return;
    try {
      if (job.name === "email.send") {
        await sendTransactionalEmail(job.data.payload);
      } else {
        throw new Error("Unsupported outbox event: " + job.name);
      }
      event.status = "processed";
      event.processedAt = new Date();
      await event.save();
    } catch (error) {
      event.status = "failed";
      event.attempts += 1;
      event.lastError = error instanceof Error ? error.message : "worker failure";
      await event.save();
      throw error;
    }
  }, { connection: redis, concurrency: 10 });

  const timer = setInterval(() => void flushOutbox().catch((error) => console.error("[outbox]", error)), 2000);
  timer.unref();
  await flushOutbox().catch((error) => console.error("[outbox]", error));
  return worker;
}
