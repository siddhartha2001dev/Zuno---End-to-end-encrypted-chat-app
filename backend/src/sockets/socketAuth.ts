import { Socket } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import { userRepository } from "../repositories/user.repository.js";

export interface SocketUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

declare module "socket.io" {
  interface Socket {
    user?: SocketUser;
  }
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }

    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    if (!user.isVerified) {
      return next(new Error("Authentication error: Email not verified. Please verify your email first."));
    }

    // Attach authenticated identity to socket
    socket.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar || null,
    };
    next();
  } catch (error) {
    next(new Error("Authentication error: Invalid or expired token"));
  }
}
