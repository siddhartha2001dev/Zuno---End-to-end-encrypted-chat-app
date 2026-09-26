import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import { userRepository } from "../repositories/user.repository.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ error: "Email not verified. Please verify your email before accessing the chat." });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar || null,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
