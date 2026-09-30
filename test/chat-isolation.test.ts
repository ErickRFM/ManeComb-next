import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: { organizationId: "tenant", sub: "sender", channel: "company_portal", roles: ["support"] },
  find: vi.fn(), update: vi.fn(), push: vi.fn(), recipient: vi.fn()
}));
vi.mock("@/src/lib/auth", () => ({ requireApiSession: async () => mocks.session }));
vi.mock("@/src/lib/db", () => ({ connectDb: async () => undefined }));
vi.mock("@/src/core/models/Message", () => ({ Message: { find: mocks.find, findOneAndUpdate: mocks.update } }));
vi.mock("@/src/core/models/User", () => ({ User: { exists: mocks.recipient } }));
vi.mock("@/src/core/services/outbox", () => ({ enqueueOutboxEvent: mocks.push }));
import { GET } from "@/app/api/chat/messages/route";
import { registerChatHandler } from "@/src/realtime/handlers/chat.handler";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) });
  mocks.recipient.mockResolvedValue(true);
});

it("portal channel history excludes all direct messages", async () => {
  expect((await GET(new Request("http://localhost/api/chat/messages?channelId=dispatch"))).status).toBe(200);
  expect(mocks.find.mock.calls[0][0]).toMatchObject({ recipientUserId: null });
});

it("direct history is limited to the caller and requested recipient", async () => {
  await GET(new Request("http://localhost/api/chat/messages?channelId=dispatch&recipientUserId=peer"));
  expect(mocks.find.mock.calls[0][0].$or).toEqual([
    { senderUserId: "sender", recipientUserId: "peer" },
    { senderUserId: "peer", recipientUserId: "sender" }
  ]);
});

function socketHarness() {
  const handlers: Record<string, Function> = {};
  const emit = vi.fn();
  const io: any = { to: vi.fn(() => io), emit };
  const socket: any = { data: { session: mocks.session }, on: (event: string, fn: Function) => { handlers[event] = fn; } };
  registerChatHandler(io, socket);
  return { send: handlers["chat:message"], io, emit };
}

it("a duplicate routes and idempotently enqueues using the stored destination", async () => {
  const stored = { _id: "msg", senderUserId: "sender", recipientUserId: "peer", channelId: "private", kind: "text", body: "private" };
  mocks.update.mockResolvedValue({ value: stored, lastErrorObject: { updatedExisting: true } });
  const { send, io } = socketHarness();
  const ack = vi.fn();
  await send({ channelId: "public", clientMessageId: "message-123", body: "replay" }, ack);
  expect(mocks.update.mock.calls[0][0]).toMatchObject({ senderUserId: "sender" });
  expect(io.to.mock.calls.map((call: unknown[]) => call[0])).toEqual(["user:sender", "user:peer"]);
  expect(mocks.push).toHaveBeenCalledWith("push.send",expect.objectContaining({userId:"peer",body:"private"}),"tenant","msg");
  expect(ack).toHaveBeenCalledWith({ ok: true, message: stored });
});

it("another sender's id collision is rejected without revealing or broadcasting content", async () => {
  mocks.update.mockRejectedValue(Object.assign(new Error("database detail"), { code: 11000 }));
  const { send, emit } = socketHarness();
  const ack = vi.fn();
  await send({ channelId: "public", clientMessageId: "message-123", body: "replay" }, ack);
  expect(ack).toHaveBeenCalledWith({ ok: false, error: "CHAT_MESSAGE_ID_CONFLICT" });
  expect(emit).not.toHaveBeenCalled();
});
