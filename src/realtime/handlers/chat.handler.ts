import type { Server, Socket } from "socket.io";
import { ChatMessageSchema } from "@/src/core/contracts/realtime";
import { connectDb } from "@/src/lib/db";
import { Message } from "@/src/core/models/Message";
import { User } from "@/src/core/models/User";
import { assertManagedAssetReference } from "@/src/lib/managed-assets";
import { hasPermission } from "@/src/core/domain/permissions";
import { rtcRoom, userRoom } from "@/src/realtime/rooms";

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

      if (input.recipientUserId) {
        const recipient = await User.exists({
          _id: input.recipientUserId,
          organizationId: session.organizationId,
          active: true,
          roles: { $in: ["owner","admin","dispatcher","supervisor","driver"] }
        });
        if (!recipient) throw new Error("CHAT_RECIPIENT_NOT_FOUND");
      }

      const message = await Message.findOneAndUpdate(
        {
          organizationId: session.organizationId,
          senderUserId: session.sub,
          clientMessageId: input.clientMessageId
        },
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

      if (input.recipientUserId) {
        io.to(userRoom(session.sub)).to(userRoom(input.recipientUserId)).emit("chat:message", message);
      } else {
        io.to(rtcRoom(session.organizationId)).emit("chat:message", message);
      }
      ack?.({ ok: true, message });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "CHAT_ERROR" });
    }
  });
}
