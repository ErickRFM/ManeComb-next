import { expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ status: "pending", staleSave: vi.fn() }));
vi.mock("@/src/lib/db", () => ({ connectDb: async () => undefined }));
vi.mock("@/src/core/models/OutboxEvent", () => ({ OutboxEvent: {
  find: () => ({ sort: () => ({ limit: async () => [{ _id: "event", type: "email.send", payload: {}, save: state.staleSave }] }) }),
  updateOne: async (filter: any, update: any) => {
    if (state.status === filter.status) state.status = update.$set.status;
  }
} }));
vi.mock("@/src/lib/queue", () => ({ getCommunicationQueue: async () => ({
  // Simulate the real worker completing before queue.add returns to the flusher.
  add: async () => { state.status = "processed"; }
}) }));
import { flushOutbox } from "@/src/worker/communication-worker";

it("cannot overwrite a completed event with a stale queued snapshot", async () => {
  await flushOutbox();
  expect(state.status).toBe("processed");
  expect(state.staleSave).not.toHaveBeenCalled();
});
