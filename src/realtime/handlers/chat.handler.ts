import type { Server, Socket } from "socket.io";
import { ChatMessageSchema } from "@/src/core/contracts/realtime";
import { connectDb } from "@/src/lib/db";
import { Message } from "@/src/core/models/Message";
import { assertManagedAssetReference } from "@/src/lib/managed-assets";
import { hasPermission } from "@/src/core/domain/permissions";
import { rtcRoom } from "@/src/realtime/rooms";

export function registerChatHandler(io: Server, socket: Socket) {
  socket.on("chat:message", async (payload, ack) => {
    try {
      const session = socket.data.session;
      if (!session?.organizationId || !hasPermission(session.roles, "access_rtc")) throw new Error("FORBIDDEN");
      const input = ChatMessageSchema.parse(payload);

      if (input.kind === "image" && input.attachment) {
        assertManagedAssetReference({
          organizationId: session.organizationId,
          kind: "chat",
          url: input.attachment.url,
          publicId: input.attachment.publicId,
          bytes: input.attachment.bytes,
          mimeType: input.attachment.mimeType
        });
      }

      await connectDb();
      const message = await Message.findOneAndUpdate(
        { organizationId: session.organizationId, clientMessageId: input.clientMessageId },
        {
          $setOnInsert: {
            organizationId: session.organizationId,
            senderUserId: session.sub,
            recipientUserId: input.recipientUserId || null,
            channelId: input.channelId,
            kind: input.kind,
            body: input.body.trim(),
            attachment: input.attachment || null,
            clientMessageId: input.clientMessageId
          }
        },
        { upsert: true, new: true }
      ).lean();
      io.to(rtcRoom(session.organizationId)).emit("chat:message", message);
      ack?.({ ok: true, message });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "CHAT_ERROR" });
    }
  });
}
