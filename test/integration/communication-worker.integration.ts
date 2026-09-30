import mongoose from "mongoose";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { QueueEvents } from "bullmq";
import { connectDb } from "@/src/lib/db";
import { ensureRedis } from "@/src/lib/redis";
import { getCommunicationQueue } from "@/src/lib/queue";
import { communicationQueueName, communicationQueuePrefix } from "@/src/lib/runtime-namespace";
import { startCommunicationWorker } from "@/src/worker/communication-worker";
import { OutboxEvent } from "@/src/core/models/OutboxEvent";
import { requireIntegrationDatabase } from "../support/integration-database";

const deliver = vi.hoisted(() => vi.fn(async () => ({ id: "qa-email" })));
vi.mock("@/src/lib/email", () => ({ sendTransactionalEmail: deliver }));
let worker: Awaited<ReturnType<typeof startCommunicationWorker>>;
let events: QueueEvents;
const ownedIds: string[] = [];

beforeAll(async () => {
  const database = requireIntegrationDatabase(process.env.MONGODB_URI);
  if (process.env.REDIS_NAMESPACE !== database) throw new Error("Worker QA requires a matching isolated Redis namespace");
  await connectDb();
  if (mongoose.connection.name !== database) throw new Error("Worker QA database mismatch");
  const redis = await ensureRedis();
  if (!redis) throw new Error("Worker QA requires Redis");
  events = new QueueEvents(communicationQueueName(), { connection: redis, prefix: communicationQueuePrefix() });
  await events.waitUntilReady();
  worker = await startCommunicationWorker();
  await worker?.waitUntilReady();
});

afterAll(async () => {
  await worker?.close();
  await events?.close();
  const queue = await getCommunicationQueue();
  // Only this disposable database's queue is owned by the test.
  await queue.obliterate({ force: true });
  await queue.close();
  await OutboxEvent.deleteMany({ _id: { $in: ownedIds } });
  await mongoose.disconnect();
  await (await ensureRedis())?.quit();
});

it("processes an actual queued email with a stubbed provider and records completion", async () => {
  const event = await OutboxEvent.create({ type: "email.send", status: "queued", payload: { to: "qa@example.invalid" } });
  ownedIds.push(String(event._id));
  const queue = await getCommunicationQueue();
  const job = await queue.add(event.type, { outboxId: String(event._id), payload: event.payload }, { jobId: String(event._id) });
  await job.waitUntilFinished(events, 10_000);
  expect(deliver).toHaveBeenCalledOnce();
  const saved = await OutboxEvent.findById(event._id);
  expect(saved!.status).toBe("processed");
  expect(saved!.processedAt).toBeInstanceOf(Date);
  const keys = await (await ensureRedis())!.keys(communicationQueuePrefix() + ":*");
  expect(keys.length).toBeGreaterThan(0);
  expect(keys.every(key => key.startsWith(process.env.REDIS_NAMESPACE + ":"))).toBe(true);
});

it("retries a provider failure and preserves its attempt count after recovery", async () => {
  deliver.mockRejectedValueOnce(new Error("QA provider unavailable"));
  const event = await OutboxEvent.create({ type: "email.send", status: "queued", payload: { to: "qa@example.invalid" } });
  ownedIds.push(String(event._id));
  const job = await (await getCommunicationQueue()).add(event.type, { outboxId: String(event._id), payload: event.payload }, { jobId: String(event._id), attempts: 2, backoff: { type: "fixed", delay: 50 } });
  await job.waitUntilFinished(events, 10_000);
  const saved = await OutboxEvent.findById(event._id);
  expect(saved!.status).toBe("processed");
  expect(saved!.attempts).toBe(1);
  expect(saved!.lastError).toBe("QA provider unavailable");
});
