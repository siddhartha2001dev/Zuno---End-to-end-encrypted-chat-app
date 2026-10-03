import { MessageModel, IMessage } from "../models/message.model.js";
import { ConversationModel } from "../models/conversation.model.js";
import { MessageReadModel } from "../models/messageRead.model.js";
import { MessageReactionModel } from "../models/messageReaction.model.js";
import mongoose from "mongoose";

export class MessageRepository {
  async createMessage(data: {
    conversationId: string;
    senderId: string;
    content?: string;
    ciphertext?: string;
    iv?: string;
    senderPublicKey?: string | null;
    recipientPublicKey?: string | null;
    deviceKeys?: Record<string, { encryptedKey: string; iv: string }> | null;
    mediaUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    messageType?: "text" | "image" | "file" | "audio";
  }) {
    const doc = await MessageModel.create({
      conversationId: new mongoose.Types.ObjectId(data.conversationId),
      senderId: new mongoose.Types.ObjectId(data.senderId),
      content: data.content || "",
      ciphertext: data.ciphertext || null,
      iv: data.iv || null,
      senderPublicKey: data.senderPublicKey || null,
      recipientPublicKey: data.recipientPublicKey || null,
      deviceKeys: data.deviceKeys || null,
      mediaUrl: data.mediaUrl || null,
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      messageType: data.messageType || "text",
    });

    // Keep conversation updatedAt synchronized with recent message activity
    await ConversationModel.findByIdAndUpdate(data.conversationId, {
      updatedAt: new Date(),
    });

    const populated = await doc.populate("senderId", "name chatId email avatar publicKey devices isDeactivated");
    const json = populated.toJSON() as any;

    return {
      ...json,
      reads: [],
      reactions: [],
    };
  }

  async getMessagesByConversation(
    conversationId: string,
    limit = 50,
    cursor?: string
  ) {
    const query: any = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
      deletedAt: null,
    };

    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
    }

    const messages = await MessageModel.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("senderId", "name chatId email avatar publicKey devices isDeactivated");

    const messageIds = messages.map((m) => m._id);

    // Fetch reads and reactions concurrently
    const [reads, reactions] = await Promise.all([
      MessageReadModel.find({ messageId: { $in: messageIds } }),
      MessageReactionModel.find({ messageId: { $in: messageIds } }),
    ]);

    return messages.map((m) => {
      const json = m.toJSON() as any;
      const mReads = reads
        .filter((r) => r.messageId.toString() === m._id.toString())
        .map((r) => ({
          userId: r.userId.toString(),
          readAt: r.readAt.toISOString(),
        }));
      const mReactions = reactions
        .filter((r) => r.messageId.toString() === m._id.toString())
        .map((r) => ({
          id: r._id.toString(),
          messageId: r.messageId.toString(),
          userId: r.userId.toString(),
          reaction: r.reaction,
          createdAt: r.createdAt.toISOString(),
        }));

      return {
        ...json,
        reads: mReads,
        reactions: mReactions,
      };
    });
  }

  async findById(messageId: string): Promise<IMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) return null;
    return MessageModel.findById(messageId);
  }

  async updateContent(messageId: string, content: string) {
    const doc = await MessageModel.findByIdAndUpdate(
      messageId,
      { content },
      { new: true }
    ).populate("senderId", "name chatId email avatar isDeactivated");

    if (!doc) return null;
    const json = doc.toJSON() as any;

    const [reads, reactions] = await Promise.all([
      MessageReadModel.find({ messageId: doc._id }),
      MessageReactionModel.find({ messageId: doc._id }),
    ]);

    return {
      ...json,
      reads: reads.map((r) => ({ userId: r.userId.toString(), readAt: r.readAt.toISOString() })),
      reactions: reactions.map((r) => ({
        id: r._id.toString(),
        messageId: r.messageId.toString(),
        userId: r.userId.toString(),
        reaction: r.reaction,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async softDelete(messageId: string) {
    return MessageModel.findByIdAndUpdate(messageId, { deletedAt: new Date() });
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<string[]> {
    const cId = new mongoose.Types.ObjectId(conversationId);
    const uId = new mongoose.Types.ObjectId(userId);

    const messages = await MessageModel.find({
      conversationId: cId,
      senderId: { $ne: uId },
      deletedAt: null,
    }).select("_id");

    const messageIds = messages.map((m) => m._id);
    if (messageIds.length === 0) return [];

    const existingReads = await MessageReadModel.find({
      messageId: { $in: messageIds },
      userId: uId,
    }).select("messageId");

    const existingSet = new Set(existingReads.map((r) => r.messageId.toString()));
    const unreadIds = messageIds.filter((id) => !existingSet.has(id.toString()));

    if (unreadIds.length > 0) {
      await MessageReadModel.insertMany(
        unreadIds.map((id) => ({
          messageId: id,
          userId: uId,
          readAt: new Date(),
        })),
        { ordered: false }
      ).catch(() => {});
    }

    return unreadIds.map((id) => id.toString());
  }

  async addReaction(messageId: string, userId: string, reaction: string) {
    const mId = new mongoose.Types.ObjectId(messageId);
    const uId = new mongoose.Types.ObjectId(userId);

    // Enforce 1 reaction per user per message: updates existing reaction or creates new one
    return MessageReactionModel.findOneAndUpdate(
      { messageId: mId, userId: uId },
      { messageId: mId, userId: uId, reaction, createdAt: new Date() },
      { upsert: true, new: true }
    );
  }

  async removeReaction(messageId: string, userId: string, reaction?: string) {
    const mId = new mongoose.Types.ObjectId(messageId);
    const uId = new mongoose.Types.ObjectId(userId);

    const filter: any = { messageId: mId, userId: uId };
    if (reaction) {
      filter.reaction = reaction;
    }

    return MessageReactionModel.deleteMany(filter);
  }
}

export const messageRepository = new MessageRepository();
