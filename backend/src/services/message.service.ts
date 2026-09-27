import { MessageRepository, messageRepository } from "../repositories/message.repository.js";
import {
  ConversationRepository,
  conversationRepository,
} from "../repositories/conversation.repository.js";
import { AppError } from "../middleware/error.middleware.js";

export class MessageService {
  constructor(
    private readonly messageRepo: MessageRepository = messageRepository,
    private readonly conversationRepo: ConversationRepository = conversationRepository
  ) {}

  async createMessage(input: {
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
    const isMember = await this.conversationRepo.isUserMember(
      input.conversationId,
      input.senderId
    );
    if (!isMember) {
      throw new AppError(
        "Unauthorized: You are not a member of this conversation",
        403
      );
    }

    const message = await this.messageRepo.createMessage(input);
    return message;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: { limit?: number; cursor?: string }
  ) {
    const isMember = await this.conversationRepo.isUserMember(
      conversationId,
      userId
    );
    if (!isMember) {
      throw new AppError(
        "Unauthorized: You are not a member of this conversation",
        403
      );
    }

    return this.messageRepo.getMessagesByConversation(
      conversationId,
      query.limit,
      query.cursor
    );
  }

  async markAsRead(conversationId: string, userId: string): Promise<string[]> {
    const isMember = await this.conversationRepo.isUserMember(
      conversationId,
      userId
    );
    if (!isMember) {
      throw new AppError(
        "Unauthorized: You are not a member of this conversation",
        403
      );
    }

    return this.messageRepo.markConversationAsRead(conversationId, userId);
  }

  async editMessage(input: { messageId: string; userId: string; content: string }) {
    const message = await this.messageRepo.findById(input.messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    if (message.senderId.toString() !== input.userId) {
      throw new AppError("Unauthorized: You can only edit your own messages", 403);
    }

    return this.messageRepo.updateContent(input.messageId, input.content);
  }

  async deleteMessage(input: { messageId: string; userId: string }) {
    const message = await this.messageRepo.findById(input.messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    if (message.senderId.toString() !== input.userId) {
      throw new AppError("Unauthorized: You can only delete your own messages", 403);
    }

    await this.messageRepo.softDelete(input.messageId);
    return { id: input.messageId, conversationId: message.conversationId.toString() };
  }

  async addReaction(input: { messageId: string; userId: string; reaction: string }) {
    const message = await this.messageRepo.findById(input.messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    const isMember = await this.conversationRepo.isUserMember(
      message.conversationId.toString(),
      input.userId
    );
    if (!isMember) {
      throw new AppError("Unauthorized: You are not a member of this conversation", 403);
    }

    await this.messageRepo.addReaction(
      input.messageId,
      input.userId,
      input.reaction
    );
    return {
      messageId: input.messageId,
      conversationId: message.conversationId.toString(),
      userId: input.userId,
      reaction: input.reaction,
    };
  }

  async removeReaction(input: { messageId: string; userId: string; reaction: string }) {
    const message = await this.messageRepo.findById(input.messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    const isMember = await this.conversationRepo.isUserMember(
      message.conversationId.toString(),
      input.userId
    );
    if (!isMember) {
      throw new AppError("Unauthorized: You are not a member of this conversation", 403);
    }

    await this.messageRepo.removeReaction(
      input.messageId,
      input.userId,
      input.reaction
    );
    return {
      messageId: input.messageId,
      conversationId: message.conversationId.toString(),
      userId: input.userId,
      reaction: input.reaction,
    };
  }
}

export const messageService = new MessageService();
