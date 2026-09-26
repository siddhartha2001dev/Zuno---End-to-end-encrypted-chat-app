import crypto from "crypto";
import { UserRepository, userRepository } from "../repositories/user.repository.js";
import { RegisterInput, LoginInput } from "../validators/auth.validator.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { AppError } from "../middleware/error.middleware.js";
import { sendVerificationEmail } from "../config/brevo.js";

/** Generate a secure random hex token for email verification */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Verification token is valid for 24 hours */
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

export class AuthService {
  constructor(private readonly userRepo: UserRepository = userRepository) {}

  async register(input: RegisterInput) {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      // If legacy or incomplete record missing chatId, complete it and log in
      if (!existing.chatId) {
        existing.chatId = input.chatId;
        existing.name = input.name;
        existing.passwordHash = await hashPassword(input.password);
        existing.isVerified = true;
        await existing.save();

        const token = generateToken({ userId: existing._id.toString(), email: existing.email });
        return {
          user: {
            id: existing._id.toString(),
            name: existing.name,
            chatId: existing.chatId,
            email: existing.email,
            avatar: existing.avatar || null,
            publicKey: existing.publicKey || null,
            isVerified: true,
            createdAt: existing.createdAt,
          },
          token,
          accessToken: token,
          message: "Registration successful! Welcome to Zuno.",
          requiresVerification: false,
        };
      }
      throw new AppError("Email is already registered. Please sign in.", 409);
    }

    // Check chatId uniqueness
    const existingChatId = await this.userRepo.findByChatId(input.chatId);
    if (existingChatId) {
      throw new AppError("This Chat ID is already taken. Please choose a different one.", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const user = await this.userRepo.create({
      name: input.name,
      chatId: input.chatId,
      email: input.email,
      passwordHash,
      avatar: input.avatar,
      verificationToken,
      verificationTokenExpiry,
    });

    // Send verification email via Brevo in background (non-blocking)
    try {
      sendVerificationEmail(user.email, user.name, verificationToken).catch((emailErr) => {
        console.warn("⚠️ Background verification email notice:", emailErr?.message || emailErr);
      });
    } catch (emailErr) {
      console.warn("⚠️ Background verification email notice:", emailErr);
    }

    // Registration does not auto-login. User must verify email.
    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        chatId: user.chatId,
        email: user.email,
        avatar: user.avatar || null,
        publicKey: user.publicKey || null,
        isVerified: false,
        createdAt: user.createdAt,
      },
      message: "Registration successful! Please check your email to verify your account.",
      requiresVerification: true,
      emailSent: true,
    };
  }

  async login(input: LoginInput) {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const hash = user.passwordHash || (user as any).password;
    if (!hash) {
      throw new AppError("Invalid email or password", 401);
    }

    const isMatch = await comparePassword(input.password, hash);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    // Enforce email verification. Reject if not verified.
    if (!user.isVerified) {
      throw new AppError('Your email has not been verified. Please check your inbox and click the verification link to log in.', 401);
    }

    if (user.isDeactivated) {
      await this.userRepo.reactivate(user._id.toString());
    }

    const token = generateToken({ userId: user._id.toString(), email: user.email });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        chatId: user.chatId,
        email: user.email,
        avatar: user.avatar || null,
        publicKey: user.publicKey || null,
        isVerified: true,
        createdAt: user.createdAt,
      },
      token,
      accessToken: token,
    };
  }

  async verifyEmail(verificationToken: string) {
    if (!verificationToken || typeof verificationToken !== "string") {
      throw new AppError("Verification token is required", 400);
    }

    const user = await this.userRepo.findByVerificationToken(verificationToken);
    if (!user) {
      throw new AppError("Invalid or expired verification link. Please request a new one.", 400);
    }

    await this.userRepo.markAsVerified(user._id.toString());

    // Auto-login after verification: generate JWT so user enters chat
    const token = generateToken({ userId: user._id.toString(), email: user.email });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        chatId: user.chatId,
        email: user.email,
        avatar: user.avatar || null,
        publicKey: user.publicKey || null,
        isVerified: true,
        createdAt: user.createdAt,
      },
      token,
      accessToken: token,
      message: "Email verified successfully! You are now logged in.",
    };
  }

  async resendVerification(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return { message: "If this email is registered, a verification link has been sent." };
    }

    if (user.isVerified) {
      throw new AppError("This email is already verified. Please sign in.", 400);
    }

    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    await this.userRepo.updateVerificationToken(
      user._id.toString(),
      verificationToken,
      verificationTokenExpiry
    );

    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailErr: any) {
      console.error("⚠️ Failed to resend verification email:", emailErr?.message || emailErr);
      throw new AppError("Failed to send verification email. Please try again later.", 500);
    }

    return {
      message: "Verification email sent successfully! Please check your inbox and spam folder.",
      emailSent: true,
    };
  }

  async getCurrentUser(userId: string) {
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
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
