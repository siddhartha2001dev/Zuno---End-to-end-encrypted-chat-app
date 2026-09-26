import { Request, Response, NextFunction } from "express";
import { conversationService, ConversationService } from "../services/conversation.service.js";
import {
  createDirectConversationSchema,
  createGroupConversationSchema,
  addMemberSchema,
} from "../validators/conversation.validator.js";

export class ConversationController {
  constructor(
    private readonly service: ConversationService = conversationService
  ) {}

  createDirect = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = createDirectConversationSchema.parse(req.body);
      const conversation = await this.service.getOrCreateDirectConversation(
        req.user!.id,
        validated
      );
      res.status(201).json({ conversation });
    } catch (error) {
      next(error);
    }
  };

  createGroup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = createGroupConversationSchema.parse(req.body);
      const conversation = await this.service.createGroupConversation(
        req.user!.id,
        validated
      );
      res.status(201).json({ conversation });
    } catch (error) {
      next(error);
    }
  };

  list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const conversations = await this.service.getUserConversations(
        req.user!.id
      );
      res.status(200).json({ conversations });
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const conversation = await this.service.getConversationById(
        req.params.id,
        req.user!.id
      );
      res.status(200).json({ conversation });
    } catch (error) {
      next(error);
    }
  };

  addMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = addMemberSchema.parse(req.body);
      const member = await this.service.addMember(
        req.params.id,
        req.user!.id,
        validated
      );
      res.status(201).json({ member });
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.service.removeMember(
        req.params.id,
        req.user!.id,
        req.params.userId
      );
      res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
      next(error);
    }
  };

  deleteConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.deleteConversation(
        req.params.id,
        req.user!.id
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  deleteAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.deleteAllConversations(req.user!.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const conversationController = new ConversationController();
