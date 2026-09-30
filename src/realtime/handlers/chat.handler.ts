import type { Server, Socket } from "socket.io";
import { ChatJoinSchema, ChatMessageSchema } from "@/src/core/contracts/realtime";
import { hasPermission } from "@/src/core/domain/permissions";
import { allowSocketEvent } from "@/src/realtime/socket-rate-limit";
import { connectDb } from "@/src/lib/db";
import { Message } from "@/src/core/models/Message";
import { User } from "@/src/core/models/User";
import { enqueueOutboxEvent } from "@/src/core/services/outbox";
import { verifyTenantCloudinaryAsset } from "@/src/lib/cloudinary";

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
      if(!allowSocketEvent(socket,"chat:message",60,60_000)) throw new Error("RATE_LIMITED");
      const session = socket.data.session;
      if (!session?.organizationId || !hasPermission(session.roles, "access_chat")) throw new Error("FORBIDDEN");
      const input = ChatMessageSchema.parse(payload);
      if(input.attachment)await verifyTenantCloudinaryAsset({organizationId:session.organizationId,kind:"chat",...input.attachment});
      await connectDb();

      if (input.recipientUserId) {
        const recipient = await User.exists({
          _id: input.recipientUserId,
          organizationId: session.organizationId,
          active: true
        });
        if (!recipient) throw new Error("CHAT_RECIPIENT_NOT_FOUND");
      }

      const result = await Message.findOneAndUpdate(
        { organizationId: session.organizationId, senderUserId: session.sub, clientMessageId: input.clientMessageId },
        {
          $setOnInsert: {
            organizationId: session.organizationId,
            senderUserId: session.sub,
            recipientUserId: input.recipientUserId || null,
            channelId: input.channelId,
            kind: input.kind,
            body: input.body,
            attachment:input.attachment||null,
            clientMessageId: input.clientMessageId
          }
        },
        { upsert: true, new: true, includeResultMetadata: true }
      );
      const message = result.value;
      if (!message) throw new Error("CHAT_PERSIST_ERROR");

      if (message.recipientUserId) {
        io.to("user:" + String(message.senderUserId)).to("user:" + String(message.recipientUserId)).emit("chat:message", message);
        await enqueueOutboxEvent("push.send", {
          userId: String(message.recipientUserId),
          title: "Nuevo mensaje en ManeComb",
          body: message.kind === "image" ? "Recibiste una imagen." : message.body.slice(0, 140),
          url: "/operacion/chat",
          tag: "chat-" + String(message?._id || input.clientMessageId)
        }, session.organizationId, String(message._id));
      } else {
        io.to(chatRoom(session.organizationId, message.channelId)).emit("chat:message", message);
      }

      ack?.({ ok: true, message });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        ack?.({ ok: false, error: "CHAT_MESSAGE_ID_CONFLICT" });
        return;
      }
      ack?.({ ok: false, error: error instanceof Error ? error.message : "CHAT_ERROR" });
    }
  });
}
