import { io, Socket } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "https://zuno-jvv6.onrender.com").replace(/\/+$/, "");

class SocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;
  private activeConversationId: string | null = null;

  connect(token: string): Socket {
    if (this.socket && this.socket.connected && this.currentToken === token) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.currentToken = token;
    this.socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("⚡ Socket.IO connected:", this.socket?.id);
      if (this.activeConversationId) {
        this.socket?.emit("conversation:join", { conversationId: this.activeConversationId });
      }
    });

    this.socket.on("connect_error", (error) => {
      console.warn("⚠️ Socket.IO connection error:", error.message);
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("unauthorized") ||
        msg.includes("jwt") ||
        msg.includes("token") ||
        msg.includes("auth")
      ) {
        window.dispatchEvent(
          new CustomEvent("auth:unauthorized", {
            detail: { message: "Socket session expired. Please sign in again." },
          })
        );
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket.IO disconnected:", reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentToken = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  joinConversation(conversationId: string): Promise<any> {
    this.activeConversationId = conversationId;
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("Socket not connected"));
      this.socket.emit("conversation:join", { conversationId }, (res: any) => {
        if (res?.success) resolve(res);
        else reject(new Error(res?.error || "Failed to join room"));
      });
    });
  }

  leaveConversation(conversationId: string) {
    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
    }
    if (this.socket) {
      this.socket.emit("conversation:leave", { conversationId });
    }
  }

  sendMessage(
    conversationIdOrPayload:
      | string
      | {
          conversationId: string;
          ciphertext?: string;
          iv?: string;
          senderPublicKey?: string | null;
          recipientPublicKey?: string | null;
          content?: string;
          mediaUrl?: string | null;
          fileName?: string | null;
          fileSize?: number | null;
          messageType?: string;
        },
    content?: string,
    messageType: "TEXT" | "IMAGE" | "FILE" | "text" | "image" | "file" = "text"
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("Socket not connected"));

      let payload: any;
      if (typeof conversationIdOrPayload === "object") {
        payload = {
          ...conversationIdOrPayload,
          messageType: (conversationIdOrPayload.messageType || "text").toLowerCase(),
        };
      } else {
        payload = {
          conversationId: conversationIdOrPayload,
          content,
          messageType: messageType.toLowerCase(),
        };
      }

      this.socket.emit("message:send", payload, (response: any) => {
        if (response?.success) resolve(response.message);
        else reject(new Error(response?.error || "Failed to send message"));
      });
    });
  }

  startTyping(conversationId: string) {
    if (this.socket) {
      this.socket.emit("typing:start", { conversationId });
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket) {
      this.socket.emit("typing:stop", { conversationId });
    }
  }

  markAsRead(conversationId: string) {
    if (this.socket) {
      this.socket.emit("message:read", { conversationId });
    }
  }

  addReaction(messageId: string, reaction: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("Socket not connected"));
      this.socket.emit(
        "message:reaction:add",
        { messageId, reaction },
        (res: any) => {
          if (res?.success) resolve(res.reaction);
          else reject(new Error(res?.error || "Failed to add reaction"));
        }
      );
    });
  }

  removeReaction(messageId: string, reaction: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("Socket not connected"));
      this.socket.emit(
        "message:reaction:remove",
        { messageId, reaction },
        (res: any) => {
          if (res?.success) resolve(res.reaction);
          else reject(new Error(res?.error || "Failed to remove reaction"));
        }
      );
    });
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
