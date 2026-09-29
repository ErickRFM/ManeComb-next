import type { Server, Socket } from "socket.io";
import { ChatJoinSchema, ChatMessageSchema } from "@/src/core/contracts/realtime";
import { hasPermission } from "@/src/core/domain/permissions";
import { connectDb } from "@/src/lib/db";
import { Message } from "@/src/core/models/Message";
import { User } from "@/src/core/models/User";
import { enqueueOutboxEvent } from "@/src/core/services/outbox";

function chatRoom(organizationId: string, channelId: string) {
  return "org:" + organizationId + ":chat:" + channelId;
}

export function registerChatHandler(io: Server, socket: Socket) {
  socket.on("chat:join", (payload, ack) => {
    try {
      const session = socket.data.session;
      if (!session?.organizationId || !hasPermission(session.roles, "access_chat")) throw new Error("FORBIDDEN");
      const { channelId } = ChatJoinSchema.parse(payload);
      socket.join(chatRoom(session.organizationId, channelId));
      ack?.({ ok: true, channelId });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "CHAT_JOIN_ERROR" });
    }
  });

  socket.on("chat:leave", (payload, ack) => {
    try {
      const session = socket.data.session;
      if (!session?.organizationId) throw new Error("FORBIDDEN");
      const { channelId } = ChatJoinSchema.parse(payload);
      socket.leave(chatRoom(session.organizationId, channelId));
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "CHAT_LEAVE_ERROR" });
    }
  });

  socket.on("chat:message", async (payload, ack) => {
    try {
      const session = socket.data.session;
      if (!session?.organizationId || !hasPermission(session.roles, "access_chat")) throw new Error("FORBIDDEN");
      const input = ChatMessageSchema.parse(payload);
      await connectDb();

      if (input.recipientUserId) {
        const recipient = await User.exists({
          _id: input.recipientUserId,
          organizationId: session.organizationId,
          active: true
        });
        if (!recipient) throw new Error("CHAT_RECIPIENT_NOT_FOUND");
      }

      const message = await Message.findOneAndUpdate(
        { organizationId: session.organizationId, clientMessageId: input.clientMessageId },
        {
          $setOnInsert: {
            organizationId: session.organizationId,
            senderUserId: session.sub,
            recipientUserId: input.recipientUserId || null,
            channelId: input.channelId,
            kind: input.kind,
            body: input.body,
            clientMessageId: input.clientMessageId
          }
        },
        { upsert: true, new: true }
      );

      if (input.recipientUserId) {
        io.to("user:" + session.sub).to("user:" + input.recipientUserId).emit("chat:message", message);
        await enqueueOutboxEvent("push.send", {
          userId: input.recipientUserId,
          title: "Nuevo mensaje en ManeComb",
          body: input.kind === "image" ? "Recibiste una imagen." : input.body.slice(0, 140),
          url: "/operacion/chat",
          tag: "chat-" + String(message?._id || input.clientMessageId)
        }, session.organizationId);
      } else {
        io.to(chatRoom(session.organizationId, input.channelId)).emit("chat:message", message);
      }

      ack?.({ ok: true, message });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "CHAT_ERROR" });
    }
  });
}
