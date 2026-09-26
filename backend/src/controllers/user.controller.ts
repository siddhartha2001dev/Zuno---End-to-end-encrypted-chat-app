import { Request, Response, NextFunction } from "express";
import { userService, UserService } from "../services/user.service.js";

export class UserController {
  constructor(private readonly service: UserService = userService) {}

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query.q as string | undefined;
      const currentUserId = req.user!.id;
      const users = await this.service.searchUsers(query, currentUserId);
      res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  };

  checkChatId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chatId = req.query.chatId as string;
      if (!chatId) {
        res.status(400).json({ available: false, message: "Chat ID is required" });
        return;
      }
      const result = await this.service.checkChatIdAvailability(chatId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getUserProfile(req.params.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  };

  updatePublicKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { publicKey } = req.body;
      const result = await this.service.updatePublicKey(req.user!.id, publicKey);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getPublicKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getPublicKey(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateName = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;
      const result = await this.service.updateName(req.user!.id, name);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided for avatar upload" });
        return;
      }

      const result = await this.service.updateAvatar(
        req.user!.id,
        req.file.buffer,
        req.file.mimetype
      );
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  removeAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.removeAvatar(req.user!.id);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  setAvatarPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { avatar } = req.body;
      const result = await this.service.setAvatarPreset(req.user!.id, avatar);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.deactivateAccount(req.user!.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
