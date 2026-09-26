import { Server, Socket } from "socket.io";

export class PresenceManager {
  // userId -> Set of active socket IDs
  private userSockets: Map<string, Set<string>> = new Map();
  // socketId -> userId (for quick reverse lookup on disconnect)
  private socketToUser: Map<string, string> = new Map();

  addSocket(userId: string, socketId: string): boolean {
    let sockets = this.userSockets.get(userId);
    const wasOffline = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set();
      this.userSockets.set(userId, sockets);
    }

    sockets.add(socketId);
    this.socketToUser.set(socketId, userId);

    return wasOffline;
  }

  removeSocket(socketId: string): { userId: string | null; isNowOffline: boolean } {
    const userId = this.socketToUser.get(socketId);
    if (!userId) {
      return { userId: null, isNowOffline: false };
    }

    this.socketToUser.delete(socketId);
    const sockets = this.userSockets.get(userId);

    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        return { userId, isNowOffline: true };
      }
    }

    return { userId, isNowOffline: false };
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getUserSocketIds(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }
}

export const presenceManager = new PresenceManager();

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const user = socket.user;
  if (!user) return;

  const becameOnline = presenceManager.addSocket(user.id, socket.id);

  // Send current online user list to the connected socket
  socket.emit("presence:list", {
    onlineUserIds: presenceManager.getOnlineUserIds(),
  });

  // If the user was previously completely offline, broadcast online status
  if (becameOnline) {
    io.emit("presence:online", {
      userId: user.id,
      userName: user.name,
    });
  }

  // Handle socket disconnect
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Socket disconnected: ${socket.id} (user: ${user.name}, reason: ${reason})`);
    const { userId, isNowOffline } = presenceManager.removeSocket(socket.id);

    if (isNowOffline && userId) {
      io.emit("presence:offline", {
        userId,
      });
    }
  });
}
