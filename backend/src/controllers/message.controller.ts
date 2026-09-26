import { Request, Response, NextFunction } from "express";
import { messageService, MessageService } from "../services/message.service.js";
import {
  sendMessageSchema,
  getMessagesQuerySchema,
  editMessageSchema,
  addReactionSchema,
} from "../validators/message.validator.js";

export class MessageController {
  constructor(private readonly service: MessageService = messageService) {}

  getMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = getMessagesQuerySchema.parse(req.query);
      const messages = await this.service.getMessages(
        req.params.conversationId,
        req.user!.id,
        query
      );
      res.status(200).json({ messages });
    } catch (error) {
      next(error);
    }
  };

  sendMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = sendMessageSchema.parse(req.body);
      const message = await this.service.createMessage({
        conversationId: req.params.conversationId,
        senderId: req.user!.id,
        content: validated.content,
        ciphertext: validated.ciphertext,
        iv: validated.iv,
        messageType: validated.messageType,
      });
      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const readMessageIds = await this.service.markAsRead(
        req.params.conversationId,
        req.user!.id
      );
      res.status(200).json({ success: true, readMessageIds });
    } catch (error) {
      next(error);
    }
  };

  editMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = editMessageSchema.parse(req.body);
      const message = await this.service.editMessage({
        messageId: req.params.messageId,
        userId: req.user!.id,
        content: validated.content,
      });
      res.status(200).json({ message });
    } catch (error) {
      next(error);
    }
  };

  deleteMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.deleteMessage({
        messageId: req.params.messageId,
        userId: req.user!.id,
      });
      res.status(200).json({ message: "Message deleted", ...result });
    } catch (error) {
      next(error);
    }
  };

  addReaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = addReactionSchema.parse(req.body);
      const reaction = await this.service.addReaction({
        messageId: req.params.messageId,
        userId: req.user!.id,
        reaction: validated.reaction,
      });
      res.status(201).json({ reaction });
    } catch (error) {
      next(error);
    }
  };

  removeReaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = addReactionSchema.parse(req.body);
      const reaction = await this.service.removeReaction({
        messageId: req.params.messageId,
        userId: req.user!.id,
        reaction: validated.reaction,
      });
      res.status(200).json({ reaction });
    } catch (error) {
      next(error);
    }
  };
}

export const messageController = new MessageController();
