import { Request, Response, NextFunction } from "express";
import { authService, AuthService } from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator.js";
import { z } from "zod";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await this.service.register(validated);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await this.service.login(validated);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const result = await this.service.forgotPassword(validated);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await this.service.resetPassword(validated);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      const result = await this.service.verifyEmail(token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = resendVerificationSchema.parse(req.body);
      const result = await this.service.resendVerification(email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };


  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getCurrentUser(req.user!.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
