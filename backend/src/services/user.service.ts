import { UserRepository, userRepository } from "../repositories/user.repository.js";
import { AppError } from "../middleware/error.middleware.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import mongoose from "mongoose";

export class UserService {
  constructor(private readonly userRepo: UserRepository = userRepository) {}

  async updateAvatar(userId: string, fileBuffer: Buffer, mimetype?: string) {
    const uploadResult = await uploadToCloudinary(fileBuffer, {
      folder: "zuno_chat/avatars",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
      ],
    });

    const updated = await this.userRepo.updateAvatar(userId, uploadResult.secureUrl);
    if (!updated) {
      throw new AppError("User not found", 404);
    }

    return {
      avatar: updated.avatar,
      user: {
        id: updated._id.toString(),
        name: updated.name,
        chatId: updated.chatId,
        email: updated.email,
        avatar: updated.avatar,
        publicKey: updated.publicKey || null,
        createdAt: updated.createdAt,
      },
    };
  }

  async removeAvatar(userId: string) {
    const updated = await this.userRepo.updateAvatar(userId, "");
    if (!updated) {
      throw new AppError("User not found", 404);
    }
    return {
      avatar: null,
      user: {
        id: updated._id.toString(),
        name: updated.name,
        chatId: updated.chatId,
        email: updated.email,
        avatar: null,
        publicKey: updated.publicKey || null,
        createdAt: updated.createdAt,
      },
    };
  }

  async setAvatarPreset(userId: string, avatar: string) {
    if (typeof avatar !== "string") {
      throw new AppError("Avatar string is required", 400);
    }
    const cleanAvatar = avatar.trim();
    const updated = await this.userRepo.updateAvatar(userId, cleanAvatar);
    if (!updated) {
      throw new AppError("User not found", 404);
    }
    return {
      avatar: updated.avatar,
      user: {
        id: updated._id.toString(),
        name: updated.name,
        chatId: updated.chatId,
        email: updated.email,
        avatar: updated.avatar,
        publicKey: updated.publicKey || null,
        createdAt: updated.createdAt,
      },
    };
  }

  async updateName(userId: string, name: string) {
    const cleanName = name?.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new AppError("Name must be at least 2 characters long", 400);
    }
    if (cleanName.length > 50) {
      throw new AppError("Name cannot exceed 50 characters", 400);
    }

    const updated = await this.userRepo.updateName(userId, cleanName);
    if (!updated) {
      throw new AppError("User not found", 404);
    }

    return {
      user: {
        id: updated._id.toString(),
        name: updated.name,
        chatId: updated.chatId,
        email: updated.email,
        avatar: updated.avatar || null,
        publicKey: updated.publicKey || null,
        isVerified: updated.isVerified,
        createdAt: updated.createdAt,
      },
      message: "Name updated successfully",
    };
  }

  async deactivateAccount(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    await this.userRepo.deactivate(userId);
    return {
      success: true,
      message: "Account deactivated successfully. You can sign in anytime to reactivate your account.",
    };
  }

  async searchUsers(query: string | undefined, currentUserId: string) {
    if (!query || query.trim() === "") {
      const users = await this.userRepo.getAllExcept(currentUserId);
      return users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        chatId: u.chatId,
        email: u.email,
        avatar: u.avatar || null,
        publicKey: u.publicKey || null,
      }));
    }

    const users = await this.userRepo.searchUsers(query.trim(), currentUserId);
    return users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      chatId: u.chatId,
      email: u.email,
      avatar: u.avatar || null,
      publicKey: u.publicKey || null,
    }));
  }

  async getUserProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return {
      id: user._id.toString(),
      name: user.name,
      chatId: user.chatId,
      email: user.email,
      avatar: user.avatar || null,
      publicKey: user.publicKey || null,
      createdAt: user.createdAt,
    };
  }

  async updatePublicKey(userId: string, publicKey: string) {
    if (!publicKey || typeof publicKey !== "string" || publicKey.trim().length === 0) {
      throw new AppError("A valid public key string is required", 400);
    }

    const updated = await this.userRepo.updatePublicKey(userId, publicKey.trim());
    if (!updated) {
      throw new AppError("User not found", 404);
    }

    return {
      id: updated._id.toString(),
      publicKey: updated.publicKey,
    };
  }

  async getPublicKey(userId: string) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return {
      userId: user._id.toString(),
      publicKey: user.publicKey || null,
    };
  }

  async checkChatIdAvailability(chatId: string) {
    if (!chatId || chatId.trim().length < 3) {
      return { available: false, message: "Chat ID must be at least 3 characters" };
    }

    const normalized = chatId.toLowerCase().trim().replace(/^@/, "");
    const validFormat = /^[a-z0-9][a-z0-9._]{2,29}$/.test(normalized);
    if (!validFormat) {
      return {
        available: false,
        message: "Chat ID must start with a letter or number and contain only lowercase letters, numbers, dots, or underscores",
      };
    }

    const existing = await this.userRepo.findByChatId(normalized);
    return {
      available: !existing,
      message: existing ? "This Chat ID is already taken" : "Chat ID is available",
    };
  }
}

export const userService = new UserService();
