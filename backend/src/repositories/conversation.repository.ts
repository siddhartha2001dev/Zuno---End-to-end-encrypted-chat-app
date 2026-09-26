import { ConversationModel, IConversation } from "../models/conversation.model.js";
import { MessageModel } from "../models/message.model.js";
import { MessageReadModel } from "../models/messageRead.model.js";
import mongoose from "mongoose";
export class ConversationRepository {
  formatConversation(conv: any, currentUserId?: string) {
    const isGroupConv = conv.type?.toLowerCase() === "group";
    const membersList = (conv.members as any[]) || [];
    const otherMembers = membersList.filter((m) => {
      const mId = (m._id || m.id || m).toString();
      return mId !== currentUserId;
    });

    return {
      id: (conv._id || conv.id).toString(),
      type: (isGroupConv ? "GROUP" : "DIRECT") as "DIRECT" | "GROUP",
      name: isGroupConv
        ? conv.name
        : otherMembers[0]?.name || "Direct Chat",
      avatar: isGroupConv
        ? conv.avatar || null
        : otherMembers[0]?.avatar || null,
      members: membersList.map((m) => {
        const mId = (m._id || m.id || m).toString();
        const isPopulated = typeof m === "object" && m !== null && m.name !== undefined;
        return {
          id: mId,
          userId: mId,
          role: conv.createdBy?.toString() === mId ? ("ADMIN" as const) : ("MEMBER" as const),
          user: isPopulated
            ? {
                id: mId,
                name: m.name,
                chatId: m.chatId,
                email: m.email,
                avatar: m.avatar || null,
                publicKey: m.publicKey || null,
              }
            : undefined,
        };
      }),
      latestMessage: null,
      isUnread: false,
      updatedAt:
        conv.updatedAt instanceof Date
          ? conv.updatedAt.toISOString()
          : conv.updatedAt || new Date().toISOString(),
    };
  }

  async findDirectConversation(user1: string, user2: string): Promise<IConversation | null> {
    const u1 = new mongoose.Types.ObjectId(user1);
    const u2 = new mongoose.Types.ObjectId(user2);

    return ConversationModel.findOne({
      type: "direct",
      members: { $all: [u1, u2], $size: 2 },
    }).populate("members", "name chatId email avatar publicKey");
  }

  async createDirectConversation(user1: string, user2: string): Promise<IConversation> {
    const u1 = new mongoose.Types.ObjectId(user1);
    const u2 = new mongoose.Types.ObjectId(user2);

    const doc = await ConversationModel.create({
      type: "direct",
      members: [u1, u2],
      createdBy: u1,
    });

    return (await doc.populate("members", "name chatId email avatar publicKey"));
  }

  async createGroupConversation(
    creatorId: string,
    name: string,
    memberIds: string[]
  ): Promise<IConversation> {
    const allMembers = Array.from(new Set([creatorId, ...memberIds])).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const doc = await ConversationModel.create({
      type: "group",
      name,
      members: allMembers,
      createdBy: new mongoose.Types.ObjectId(creatorId),
    });

    return (await doc.populate("members", "name chatId email avatar publicKey"));
  }

  async getUserConversations(userId: string) {
    const uId = new mongoose.Types.ObjectId(userId);
    const conversations = await ConversationModel.find({ members: uId })
      .sort({ updatedAt: -1 })
      .populate("members", "name chatId email avatar publicKey");

    // Enhance each conversation with latest message and unread indicator
    const results = await Promise.all(
      conversations.map(async (conv) => {
        const latestMessage = await MessageModel.findOne({
          conversationId: conv._id,
          deletedAt: null,
        })
          .sort({ createdAt: -1 })
          .populate("senderId", "name");

        let isUnread = false;
        if (latestMessage && latestMessage.senderId) {
          const senderIdStr = (
            (latestMessage.senderId as any)._id ||
            (latestMessage.senderId as any).id ||
            latestMessage.senderId
          ).toString();
          if (senderIdStr !== userId) {
            const hasRead = await MessageReadModel.exists({
              messageId: latestMessage._id,
              userId: uId,
            });
            isUnread = !hasRead;
          }
        }

        const otherMembers = (conv.members as any[]).filter(
          (m) => m._id.toString() !== userId
        );

        const isGroupConv = conv.type?.toLowerCase() === "group";

        return {
          id: conv._id.toString(),
          type: (isGroupConv ? "GROUP" : "DIRECT") as "DIRECT" | "GROUP",
          name:
            isGroupConv
              ? conv.name
              : otherMembers[0]?.name || "Direct Chat",
          avatar:
            isGroupConv
              ? conv.avatar || null
              : otherMembers[0]?.avatar || null,
          members: (conv.members as any[]).map((m) => ({
            id: m._id.toString(),
            userId: m._id.toString(),
            role: conv.createdBy?.toString() === m._id.toString() ? "ADMIN" : "MEMBER",
            user: {
              id: m._id.toString(),
              name: m.name,
              email: m.email,
              avatar: m.avatar,
              publicKey: m.publicKey || null,
            },
          })),
          latestMessage: latestMessage
            ? {
                id: latestMessage._id.toString(),
                content: latestMessage.content,
                ciphertext: latestMessage.ciphertext || null,
                iv: latestMessage.iv || null,
                createdAt: latestMessage.createdAt.toISOString(),
                senderId: (
                  (latestMessage.senderId as any)?._id ||
                  (latestMessage.senderId as any)?.id ||
                  latestMessage.senderId
                )?.toString() || "",
                senderName: (latestMessage.senderId as any)?.name || "",
              }
            : null,
          isUnread,
          updatedAt: conv.updatedAt.toISOString(),
        };
      })
    );

    return results;
  }

  async findById(conversationId: string): Promise<IConversation | null> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return null;
    return ConversationModel.findById(conversationId).populate("members", "name chatId email avatar publicKey");
  }

  async isUserMember(conversationId: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return false;
    }
    const exists = await ConversationModel.exists({
      _id: conversationId,
      members: new mongoose.Types.ObjectId(userId),
    });
    return !!exists;
  }

  async addMember(conversationId: string, userId: string): Promise<IConversation | null> {
    return ConversationModel.findByIdAndUpdate(
      conversationId,
      { $addToSet: { members: new mongoose.Types.ObjectId(userId) } },
      { new: true }
    ).populate("members", "name chatId email avatar");
  }

  async removeMember(conversationId: string, userId: string): Promise<IConversation | null> {
    return ConversationModel.findByIdAndUpdate(
      conversationId,
      { $pull: { members: new mongoose.Types.ObjectId(userId) } },
      { new: true }
    ).populate("members", "name chatId email avatar");
  }

  async findRawByUserId(userId: string): Promise<IConversation[]> {
    const uId = new mongoose.Types.ObjectId(userId);
    return ConversationModel.find({ members: uId });
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return false;
    const convObjId = new mongoose.Types.ObjectId(conversationId);
    await MessageModel.deleteMany({ conversationId: convObjId });
    await MessageReadModel.deleteMany({ conversationId: convObjId });
    await ConversationModel.findByIdAndDelete(conversationId);
    return true;
  }
}

export const conversationRepository = new ConversationRepository();
