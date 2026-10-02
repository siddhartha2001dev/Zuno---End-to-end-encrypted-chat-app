import {
  ConversationRepository,
  conversationRepository,
} from "../repositories/conversation.repository.js";
import {
  CreateDirectConversationInput,
  CreateGroupConversationInput,
  AddMemberInput,
  UpdateGroupConversationInput,
} from "../validators/conversation.validator.js";
import { AppError } from "../middleware/error.middleware.js";

export class ConversationService {
  constructor(
    private readonly repo: ConversationRepository = conversationRepository
  ) {}

  async getOrCreateDirectConversation(
    currentUserId: string,
    input: CreateDirectConversationInput
  ) {
    if (currentUserId === input.participantId) {
      throw new AppError("Cannot create a conversation with yourself", 400);
    }

    const existing = await this.repo.findDirectConversation(
      currentUserId,
      input.participantId
    );
    if (existing) {
      return this.repo.formatConversation(existing, currentUserId);
    }

    const created = await this.repo.createDirectConversation(
      currentUserId,
      input.participantId
    );
    return this.repo.formatConversation(created, currentUserId);
  }

  async createGroupConversation(
    creatorId: string,
    input: CreateGroupConversationInput
  ) {
    const created = await this.repo.createGroupConversation(
      creatorId,
      input.name,
      input.memberIds
    );
    return this.repo.formatConversation(created, creatorId);
  }

  async getUserConversations(userId: string) {
    return this.repo.getUserConversations(userId);
  }

  async getConversationById(conversationId: string, userId: string) {
    const isMember = await this.repo.isUserMember(conversationId, userId);
    if (!isMember) {
      throw new AppError("Unauthorized: You are not a member of this conversation", 403);
    }

    const conversation = await this.repo.findById(conversationId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    return this.repo.formatConversation(conversation, userId);
  }

  async verifyMembership(conversationId: string, userId: string): Promise<boolean> {
    return this.repo.isUserMember(conversationId, userId);
  }

  async addMember(
    conversationId: string,
    operatorId: string,
    input: AddMemberInput
  ) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new AppError("Conversation not found", 404);

    if (conv.createdBy?.toString() !== operatorId) {
      throw new AppError("Only the group creator can add members", 403);
    }

    const alreadyMember = await this.repo.isUserMember(conversationId, input.userId);
    if (alreadyMember) {
      throw new AppError("User is already a member", 400);
    }

    return this.repo.addMember(conversationId, input.userId);
  }

  async removeMember(
    conversationId: string,
    operatorId: string,
    targetUserId: string
  ) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new AppError("Conversation not found", 404);

    if (operatorId !== targetUserId && conv.createdBy?.toString() !== operatorId) {
      throw new AppError("Only the group creator can remove other members", 403);
    }

    return this.repo.removeMember(conversationId, targetUserId);
  }

  async updateGroup(
    conversationId: string,
    userId: string,
    input: UpdateGroupConversationInput
  ) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new AppError("Conversation not found", 404);
    if (conv.type !== "group") throw new AppError("Only group conversations can be updated", 400);
    if (conv.createdBy?.toString() !== userId) {
      throw new AppError("Only the group creator can update the group", 403);
    }

    const updated = await this.repo.updateGroupFields(conversationId, input);
    if (!updated) throw new AppError("Conversation not found", 404);
    return this.repo.formatConversation(updated, userId);
  }

  async deleteConversation(conversationId: string, userId: string) {
    const isMember = await this.repo.isUserMember(conversationId, userId);
    if (!isMember) {
      throw new AppError("Unauthorized: You are not a member of this conversation", 403);
    }

    const conv = await this.repo.findById(conversationId);
    if (!conv) {
      throw new AppError("Conversation not found", 404);
    }

    if (conv.type === "direct" || conv.createdBy?.toString() === userId) {
      await this.repo.deleteConversation(conversationId);
      return { success: true, message: "Conversation deleted successfully", action: "deleted" as const };
    } else {
      await this.repo.removeMember(conversationId, userId);
      return { success: true, message: "Left and removed conversation", action: "left" as const };
    }
  }

  async deleteAllConversations(userId: string) {
    const userConversations = await this.repo.findRawByUserId(userId);
    let deletedCount = 0;
    for (const conv of userConversations) {
      const convId = conv._id.toString();
      if (conv.type === "direct" || conv.createdBy?.toString() === userId) {
        await this.repo.deleteConversation(convId);
      } else {
        await this.repo.removeMember(convId, userId);
      }
      deletedCount++;
    }
    return {
      success: true,
      message: `Deleted ${deletedCount} conversation${deletedCount === 1 ? "" : "s"} successfully`,
      deletedCount,
    };
  }
}

export const conversationService = new ConversationService();
