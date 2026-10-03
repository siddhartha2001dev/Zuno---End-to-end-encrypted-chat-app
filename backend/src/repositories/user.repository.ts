import mongoose from "mongoose";
import { UserModel, IUser } from "../models/user.model.js";

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  async create(data: {
    name: string;
    chatId: string;
    email: string;
    passwordHash: string;
    avatar?: string;
    verificationToken?: string;
    verificationTokenExpiry?: Date;
  }): Promise<IUser> {
    return UserModel.create({
      name: data.name,
      chatId: data.chatId.toLowerCase().trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name)}`,
      isVerified: false,
      verificationToken: data.verificationToken || null,
      verificationTokenExpiry: data.verificationTokenExpiry || null,
    });
  }

  async findByVerificationToken(token: string): Promise<IUser | null> {
    return UserModel.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    });
  }

  async markAsVerified(userId: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
      { new: true }
    );
  }

  async updateVerificationToken(
    userId: string,
    token: string,
    expiry: Date
  ): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        verificationToken: token,
        verificationTokenExpiry: expiry,
      },
      { new: true }
    );
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expiry: Date
  ): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { passwordResetToken: token, passwordResetTokenExpiry: expiry },
      { new: true }
    );
  }

  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    return UserModel.findOne({
      passwordResetToken: token,
      passwordResetTokenExpiry: { $gt: new Date() },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
      { new: true }
    );
  }

  async findByChatId(chatId: string): Promise<IUser | null> {
    return UserModel.findOne({ chatId: chatId.toLowerCase().trim() });
  }

  async deleteById(id: string): Promise<IUser | null> {
    return UserModel.findByIdAndDelete(id);
  }

  async searchUsers(query: string, excludeUserId: string): Promise<IUser[]> {
    const clean = query.trim();
    if (!clean) return [];

    const cleanChatId = clean.replace(/^@/, "");
    const escapedQuery = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedChatId = cleanChatId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const orConditions: any[] = [
      { chatId: { $regex: escapedChatId, $options: "i" } },
      { name: { $regex: escapedQuery, $options: "i" } },
      { email: { $regex: escapedQuery, $options: "i" } },
    ];

    if (mongoose.Types.ObjectId.isValid(clean)) {
      orConditions.push({ _id: clean });
    }

    return UserModel.find({
      _id: { $ne: excludeUserId },
      isDeactivated: { $ne: true },
      isVerified: true,
      $or: orConditions,
    })
      .select("-passwordHash")
      .limit(20);
  }

  async getAllExcept(userId: string): Promise<IUser[]> {
    return UserModel.find({
      _id: { $ne: userId },
      isDeactivated: { $ne: true },
      isVerified: true,
    })
      .select("-passwordHash")
      .limit(50);
  }

  async updatePublicKey(
    userId: string,
    publicKey: string,
    deviceId?: string,
    deviceName?: string
  ): Promise<IUser | null> {
    const cleanKey = publicKey.trim();
    if (!deviceId) {
      return UserModel.findByIdAndUpdate(
        userId,
        { publicKey: cleanKey },
        { new: true }
      );
    }

    const user = await UserModel.findById(userId);
    if (!user) return null;

    if (!user.devices) {
      user.devices = [];
    }

    const existingDeviceIndex = user.devices.findIndex(
      (d) => d.deviceId === deviceId
    );

    if (existingDeviceIndex >= 0) {
      user.devices[existingDeviceIndex].publicKey = cleanKey;
      user.devices[existingDeviceIndex].lastActive = new Date();
      if (deviceName) {
        user.devices[existingDeviceIndex].deviceName = deviceName;
      }
    } else {
      user.devices.push({
        deviceId,
        publicKey: cleanKey,
        deviceName: deviceName || "Browser",
        lastActive: new Date(),
      });
    }

    user.publicKey = cleanKey;
    await user.save();
    return user;
  }

  async updateName(userId: string, name: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true }
    );
  }

  async updateAvatar(userId: string, avatar: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true }
    );
  }

  async deactivate(userId: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { isDeactivated: true, deactivatedAt: new Date() },
      { new: true }
    );
  }

  async reactivate(userId: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { isDeactivated: false, deactivatedAt: null },
      { new: true }
    );
  }
}

export const userRepository = new UserRepository();
