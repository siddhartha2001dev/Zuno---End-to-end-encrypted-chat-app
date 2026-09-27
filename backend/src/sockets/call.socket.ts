import { Server, Socket } from "socket.io";
import { conversationService } from "../services/conversation.service.js";

// In-memory tracking of active calls for automatic disconnect cleanup
interface ActiveCallSession {
  callId: string;
  conversationId: string;
  callerId: string;
  recipientId: string;
  startedAt: Date;
}

const activeCalls = new Map<string, ActiveCallSession>();
// Map userId -> active callId
const userActiveCall = new Map<string, string>();

export function registerCallHandlers(io: Server, socket: Socket) {
  const user = socket.user!;

  // 1. Initiate 1-to-1 Audio Call
  socket.on(
    "call:initiate",
    async (
      data: { conversationId: string; recipientId: string },
      callback?: (res: { success: boolean; callId?: string; error?: string }) => void
    ) => {
      try {
        const { conversationId, recipientId } = data;
        if (!conversationId || !recipientId) {
          if (callback) callback({ success: false, error: "conversationId and recipientId are required" });
          return;
        }

        if (recipientId === user.id) {
          if (callback) callback({ success: false, error: "Cannot call yourself" });
          return;
        }

        // Verify caller membership in the conversation
        const isCallerMember = await conversationService.verifyMembership(conversationId, user.id);
        if (!isCallerMember) {
          if (callback) callback({ success: false, error: "Unauthorized: You are not in this conversation" });
          return;
        }

        // Verify recipient membership
        const isRecipientMember = await conversationService.verifyMembership(conversationId, recipientId);
        if (!isRecipientMember) {
          if (callback) callback({ success: false, error: "Recipient is not a member of this conversation" });
          return;
        }

        // Check if recipient is already in another call
        if (userActiveCall.has(recipientId)) {
          if (callback) callback({ success: false, error: "User is currently busy on another call" });
          return;
        }

        // Check if caller is already in another call
        if (userActiveCall.has(user.id)) {
          const prevCallId = userActiveCall.get(user.id)!;
          activeCalls.delete(prevCallId);
          userActiveCall.delete(user.id);
        }

        const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const session: ActiveCallSession = {
          callId,
          conversationId,
          callerId: user.id,
          recipientId,
          startedAt: new Date(),
        };

        activeCalls.set(callId, session);
        userActiveCall.set(user.id, callId);
        userActiveCall.set(recipientId, callId);

        // Notify recipient with incoming call signal
        io.to(`user:${recipientId}`).emit("call:incoming", {
          callId,
          conversationId,
          caller: {
            id: user.id,
            name: user.name,
            avatar: user.avatar || null,
          },
        });

        if (callback) {
          callback({ success: true, callId });
        }
      } catch (error: any) {
        console.error("❌ Error initiating call:", error);
        if (callback) callback({ success: false, error: error.message || "Failed to initiate call" });
      }
    }
  );

  // 2. Accept Incoming Call
  socket.on("call:accept", (data: { callId: string; callerId: string }) => {
    const { callId, callerId } = data;
    io.to(`user:${callerId}`).emit("call:accepted", {
      callId,
      recipientId: user.id,
    });
  });

  // 3. Reject / Decline Call
  socket.on(
    "call:reject",
    (data: { callId: string; callerId: string; reason?: string }) => {
      const { callId, callerId, reason } = data;
      activeCalls.delete(callId);
      userActiveCall.delete(user.id);
      userActiveCall.delete(callerId);

      io.to(`user:${callerId}`).emit("call:rejected", {
        callId,
        reason: reason || "declined",
      });
    }
  );

  // 4. WebRTC Offer (Caller -> Callee)
  socket.on(
    "call:offer",
    (data: { callId: string; recipientId: string; sdp: any }) => {
      const { callId, recipientId, sdp } = data;
      io.to(`user:${recipientId}`).emit("call:offer", {
        callId,
        sdp,
        callerId: user.id,
      });
    }
  );

  // 5. WebRTC Answer (Callee -> Caller)
  socket.on(
    "call:answer",
    (data: { callId: string; callerId: string; sdp: any }) => {
      const { callId, callerId, sdp } = data;
      io.to(`user:${callerId}`).emit("call:answer", {
        callId,
        sdp,
        recipientId: user.id,
      });
    }
  );

  // 6. ICE Candidate Exchange
  socket.on(
    "call:ice-candidate",
    (data: { callId: string; targetUserId: string; candidate: any }) => {
      const { callId, targetUserId, candidate } = data;
      io.to(`user:${targetUserId}`).emit("call:ice-candidate", {
        callId,
        candidate,
        senderId: user.id,
      });
    }
  );

  // 7. End Call
  socket.on(
    "call:end",
    (data: { callId: string; targetUserId: string; reason?: string }) => {
      const { callId, targetUserId, reason } = data;
      activeCalls.delete(callId);
      userActiveCall.delete(user.id);
      if (targetUserId) {
        userActiveCall.delete(targetUserId);
        io.to(`user:${targetUserId}`).emit("call:ended", {
          callId,
          reason: reason || "ended_by_user",
        });
      }
    }
  );

  // 8. Disconnect Cleanup
  socket.on("disconnect", () => {
    const callId = userActiveCall.get(user.id);
    if (callId) {
      const session = activeCalls.get(callId);
      if (session) {
        const peerId = session.callerId === user.id ? session.recipientId : session.callerId;
        io.to(`user:${peerId}`).emit("call:ended", {
          callId,
          reason: "peer_disconnected",
        });
        activeCalls.delete(callId);
        userActiveCall.delete(peerId);
      }
      userActiveCall.delete(user.id);
    }
  });
}
