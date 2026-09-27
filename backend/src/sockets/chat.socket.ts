import { Server, Socket } from "socket.io";
import { conversationService } from "../services/conversation.service.js";
import { messageService } from "../services/message.service.js";
import { ConversationModel } from "../models/conversation.model.js";
import {
  sendMessageSchema,
  editMessageSchema,
  addReactionSchema,
} from "../validators/message.validator.js";

export function registerChatHandlers(io: Server, socket: Socket) {
  const user = socket.user!;

  // 1. Join Conversation Room
  socket.on("conversation:join", async (data: { conversationId: string }, callback) => {
    try {
      const { conversationId } = data;
      if (!conversationId) {
        if (callback) callback({ success: false, error: "conversationId is required" });
        return;
      }

      // Security check: Must be a verified member of the conversation
      const isMember = await conversationService.verifyMembership(
        conversationId,
        user.id
      );
      if (!isMember) {
        if (callback)
          callback({
            success: false,
            error: "Unauthorized: You are not a member of this conversation",
          });
        return;
      }

      const room = `conversation:${conversationId}`;
      socket.join(room);
      console.log(`👤 User ${user.name} (${user.id}) joined room: ${room}`);

      if (callback) callback({ success: true, room });
    } catch (error: any) {
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // 2. Leave Conversation Room
  socket.on("conversation:leave", (data: { conversationId: string }) => {
    const { conversationId } = data;
    if (conversationId) {
      const room = `conversation:${conversationId}`;
      socket.leave(room);
      console.log(`👤 User ${user.name} left room: ${room}`);
    }
  });

  // 3. Send Message
  socket.on("message:send", async (data: any, callback) => {
    try {
      const { conversationId, content, ciphertext, iv, senderPublicKey, recipientPublicKey, deviceKeys, mediaUrl, fileName, fileSize, messageType } = data;
      if (!conversationId) {
        if (callback) callback({ success: false, error: "conversationId is required" });
        return;
      }

      // Validate payload
      const validated = sendMessageSchema.parse({
        content,
        ciphertext,
        iv,
        senderPublicKey,
        recipientPublicKey,
        deviceKeys,
        mediaUrl,
        fileName,
        fileSize,
        messageType,
      });

      // Persist in MongoDB using authoritative socket.user.id
      const message = await messageService.createMessage({
        conversationId,
        senderId: user.id,
        content: validated.content,
        ciphertext: validated.ciphertext,
        iv: validated.iv,
        senderPublicKey: validated.senderPublicKey,
        recipientPublicKey: validated.recipientPublicKey,
        deviceKeys: validated.deviceKeys,
        mediaUrl: validated.mediaUrl,
        fileName: validated.fileName,
        fileSize: validated.fileSize,
        messageType: validated.messageType,
      });

      // Emit canonical persisted message to conversation room and member user rooms (deduplicated by Socket.IO)
      const targetRooms: string[] = [`conversation:${conversationId}`];
      try {
        const conv = await ConversationModel.findById(conversationId);
        if (conv && conv.members) {
          for (const memberId of conv.members) {
            targetRooms.push(`user:${memberId.toString()}`);
          }
        }
      } catch (err) {
        console.warn("Could not broadcast message to user rooms:", err);
      }
      io.to(targetRooms).emit("message:new", message);

      if (callback) {
        callback({ success: true, message });
      }
    } catch (error: any) {
      console.error("❌ Error sending message:", error);
      if (callback) {
        callback({ success: false, error: error.message || "Failed to send message" });
      }
    }
  });

  // 4. Typing Indicators
  socket.on("typing:start", async (data: { conversationId: string }) => {
    const { conversationId } = data;
    if (!conversationId) return;

    // Verify membership
    const isMember = await conversationService.verifyMembership(conversationId, user.id);
    if (!isMember) return;

    const room = `conversation:${conversationId}`;
    socket.to(room).emit("typing:start", {
      conversationId,
      userId: user.id,
      userName: user.name,
    });
  });

  socket.on("typing:stop", (data: { conversationId: string }) => {
    const { conversationId } = data;
    if (!conversationId) return;

    const room = `conversation:${conversationId}`;
    socket.to(room).emit("typing:stop", {
      conversationId,
      userId: user.id,
    });
  });

  // 5. Delivery & Read Receipts
  socket.on("message:delivered", (data: { messageId: string; conversationId: string }) => {
    const { messageId, conversationId } = data;
    if (!messageId || !conversationId) return;

    const room = `conversation:${conversationId}`;
    socket.to(room).emit("message:delivered", {
      messageId,
      conversationId,
      userId: user.id,
    });
  });

  socket.on("message:read", async (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      const readMessageIds = await messageService.markAsRead(conversationId, user.id);
      if (readMessageIds.length > 0) {
        const room = `conversation:${conversationId}`;
        io.to(room).emit("message:read", {
          conversationId,
          userId: user.id,
          readMessageIds,
          readAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("❌ Error marking message as read:", error);
    }
  });

  // 6. Message Edit
  socket.on("message:edit", async (data: { messageId: string; content: string }, callback) => {
    try {
      const validated = editMessageSchema.parse({ content: data.content });
      const updatedMessage = await messageService.editMessage({
        messageId: data.messageId,
        userId: user.id,
        content: validated.content,
      });

      if (!updatedMessage) {
        if (callback) callback({ success: false, error: "Message not found" });
        return;
      }

      const room = `conversation:${updatedMessage.conversationId}`;
      io.to(room).emit("message:edited", updatedMessage);

      if (callback) callback({ success: true, message: updatedMessage });
    } catch (error: any) {
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // 7. Message Delete
  socket.on("message:delete", async (data: { messageId: string }, callback) => {
    try {
      const result = await messageService.deleteMessage({
        messageId: data.messageId,
        userId: user.id,
      });

      const room = `conversation:${result.conversationId}`;
      io.to(room).emit("message:deleted", {
        messageId: result.id,
        conversationId: result.conversationId,
      });

      if (callback) callback({ success: true });
    } catch (error: any) {
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // 8. Reactions
  socket.on(
    "message:reaction:add",
    async (data: { messageId: string; reaction: string }, callback) => {
      try {
        const validated = addReactionSchema.parse({ reaction: data.reaction });
        const reactionResult = await messageService.addReaction({
          messageId: data.messageId,
          userId: user.id,
          reaction: validated.reaction,
        });

        const room = `conversation:${reactionResult.conversationId}`;
        io.to(room).emit("message:reaction:added", reactionResult);

        // Also broadcast to user rooms of all conversation members
        try {
          const conv = await ConversationModel.findById(reactionResult.conversationId);
          if (conv && conv.members) {
            for (const memberId of conv.members) {
              io.to(`user:${memberId.toString()}`).emit("message:reaction:added", reactionResult);
            }
          }
        } catch (err) {
          console.warn("Could not broadcast reaction addition to user rooms:", err);
        }

        if (callback) callback({ success: true, reaction: reactionResult });
      } catch (error: any) {
        if (callback) callback({ success: false, error: error.message });
      }
    }
  );

  socket.on(
    "message:reaction:remove",
    async (data: { messageId: string; reaction: string }, callback) => {
      try {
        const validated = addReactionSchema.parse({ reaction: data.reaction });
        const reactionResult = await messageService.removeReaction({
          messageId: data.messageId,
          userId: user.id,
          reaction: validated.reaction,
        });

        const room = `conversation:${reactionResult.conversationId}`;
        io.to(room).emit("message:reaction:removed", reactionResult);

        // Also broadcast to user rooms of all conversation members
        try {
          const conv = await ConversationModel.findById(reactionResult.conversationId);
          if (conv && conv.members) {
            for (const memberId of conv.members) {
              io.to(`user:${memberId.toString()}`).emit("message:reaction:removed", reactionResult);
            }
          }
        } catch (err) {
          console.warn("Could not broadcast reaction removal to user rooms:", err);
        }

        if (callback) callback({ success: true, reaction: reactionResult });
      } catch (error: any) {
        if (callback) callback({ success: false, error: error.message });
      }
    }
  );
}
