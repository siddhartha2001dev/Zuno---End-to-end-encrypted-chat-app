import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env.js";
import { socketAuthMiddleware } from "./socketAuth.js";
import { registerPresenceHandlers } from "./presence.socket.js";
import { registerChatHandlers } from "./chat.socket.js";

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins =
    env.CORS_ORIGIN === "*"
      ? (origin: string | undefined, callback: (err: Error | null, success?: boolean) => void) =>
          callback(null, true)
      : env.CORS_ORIGIN.includes(",")
      ? env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : env.CORS_ORIGIN;

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins as any,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Handshake Middleware
  io.use(socketAuthMiddleware);

  // Connection Lifecycle Handler
  io.on("connection", (socket) => {
    const user = socket.user!;
    console.log(`⚡ Socket connected: ${socket.id} (user: ${user.name} - ${user.id})`);

    // Join personal user room for direct user-targeted events
    socket.join(`user:${user.id}`);

    // Acknowledge connection to client with authenticated user info
    socket.emit("socket:connected", {
      socketId: socket.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });

    // Register module handlers
    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
  });

  return io;
}
