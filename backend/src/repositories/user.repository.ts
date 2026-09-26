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

  async findByChatId(chatId: string): Promise<IUser | null> {
    return UserModel.findOne({ chatId: chatId.toLowerCase().trim() });
  }

  async deleteById(id: string): Promise<IUser | null> {
    return UserModel.findByIdAndDelete(id);
  }

  async searchUsers(query: string, excludeUserId: string): Promise<IUser[]> {
    const clean = query.trim();
    const cleanChatId = clean.replace(/^@/, "");
    const escapedQuery = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedChatId = cleanChatId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return UserModel.find({
      _id: { $ne: excludeUserId },
      isDeactivated: { $ne: true },
      isVerified: true,
      $or: [
        { chatId: { $regex: escapedChatId, $options: "i" } },
        { name: { $regex: escapedQuery, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
      ],
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

  async updatePublicKey(userId: string, publicKey: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { publicKey },
      { new: true }
    );
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

