import { Worker } from "bullmq";
import webpush from "web-push";
import { connectDb } from "@/src/lib/db";
import { ensureRedis } from "@/src/lib/redis";
import { getCommunicationQueue } from "@/src/lib/queue";
import { OutboxEvent } from "@/src/core/models/OutboxEvent";
import { PushSubscription } from "@/src/core/models/PushSubscription";
import { sendTransactionalEmail } from "@/src/lib/email";
import { getEnv } from "@/src/lib/env";
import { communicationQueueName, communicationQueuePrefix } from "@/src/lib/runtime-namespace";
import {User} from "@/src/core/models/User";
import {hasPermission} from "@/src/core/domain/permissions";

export async function flushOutbox() {
  await connectDb();
  const pending = await OutboxEvent.find({ status: "pending" }).sort({ createdAt: 1 }).limit(25);
  if (!pending.length) return;
  const queue = await getCommunicationQueue();
  for (const event of pending) {
    await queue.add(
      event.type,
      {
        outboxId: String(event._id),
        organizationId: event.organizationId ? String(event.organizationId) : null,
        payload: event.payload
      },
      {
        jobId: String(event._id),
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 }
      }
    );
    // A fast worker may already have completed the job. Never overwrite it.
    await OutboxEvent.updateOne({ _id: event._id, status: "pending" }, { $set: { status: "queued" } });
  }
}

async function sendPushNotification(input: { organizationId?: string | null; payload: any }) {
  const env = getEnv();
  if (!env.webPushPublicKey || !env.webPushPrivateKey || !env.webPushSubject) {
    throw new Error("Web Push VAPID is not configured");
  }

  webpush.setVapidDetails(env.webPushSubject, env.webPushPublicKey, env.webPushPrivateKey);

  const query: Record<string, unknown> = { active: true };
  if (input.organizationId) query.organizationId = input.organizationId;
  if (input.payload?.userId) query.userId = input.payload.userId;
  if(input.payload?.audience==="incident_managers"||input.payload?.url==="/portal/incidencias"){
    if(!input.organizationId)throw new Error("Incident push requires an organization");
    const users=await User.find({organizationId:input.organizationId,channel:"company_portal",active:true}).select("_id roles").lean();
    const allowed=users.filter((user:any)=>hasPermission(user.roles,"manage_incidents"));
    query.userId={$in:allowed.filter((user:any)=>!input.payload?.userId||String(user._id)===String(input.payload.userId)).map((user:any)=>user._id)};
  }

  const subscriptions = await PushSubscription.find(query).lean();

  await Promise.all(subscriptions.map(async (subscription: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify({
          title: input.payload?.title || "ManeComb",
          body: input.payload?.body || "Nueva alerta operativa",
          url: input.payload?.url || "/portal/dashboard",
          tag: input.payload?.tag
        })
      );
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await PushSubscription.updateOne({ _id: subscription._id }, { $set: { active: false } });
        return;
      }
      throw error;
    }
  }));
}

export async function startCommunicationWorker() {
  const redis = await ensureRedis();
  if (!redis) {
    console.warn("[worker] REDIS_URL missing; worker disabled");
    return null;
  }

  const worker = new Worker(communicationQueueName(), async (job) => {
    await connectDb();
    const event = await OutboxEvent.findById(job.data.outboxId);
    if (!event || event.status === "processed") return;

    event.status="processing";
    event.lastAttemptAt=new Date();
    await event.save();

    try {
      if (job.name === "email.send") {
        const provider=await sendTransactionalEmail(job.data.payload,{idempotencyKey:"outbox/"+String(event._id)});
        event.providerMessageId=provider.id;
      } else if (job.name === "push.send") {
        await sendPushNotification({
          organizationId: job.data.organizationId,
          payload: job.data.payload
        });
      } else {
        throw new Error("Unsupported outbox event: " + job.name);
      }

      event.status = "processed";
      event.processedAt = new Date();
      await event.save();
    } catch (error) {
      const maxAttempts=Number(job.opts.attempts||1);
      const finalAttempt=job.attemptsMade+1>=maxAttempts;
      event.status = finalAttempt ? "failed_final" : "retry_pending";
      event.attempts += 1;
      event.lastError = error instanceof Error ? error.message : "worker failure";
      await event.save();
      throw error;
    }
  }, { connection: redis, prefix: communicationQueuePrefix(), concurrency: 10 });

  const timer = setInterval(() => void flushOutbox().catch((error) => console.error("[outbox]", error)), 2000);
  timer.unref();
  worker.once("closed", () => clearInterval(timer));
  await flushOutbox().catch((error) => console.error("[outbox]", error));
  return worker;
}
