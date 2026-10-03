import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { Conversation, Message } from "../types";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import { useAuth } from "./AuthContext";
import { deriveConversationKey } from "../crypto/keyExchange";
import { encryptMessageMultiDevice } from "../crypto/encryption";
import type { TargetDevice } from "../crypto/encryption";
import { decryptMessage, decryptMessageMultiDevice } from "../crypto/decryption";
import { getOrInitializeKeyPair } from "../crypto/keyPair";
import { loadKeyPair } from "../crypto/keyStorage";
import { getOrCreateDeviceId } from "../crypto/device";

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  onlineUsers: Set<string>;
  typingUser: { conversationId: string; userName: string } | null;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  selectConversation: (conversation: Conversation) => void;
  clearActiveConversation: () => void;
  sendMessage: (
    content: string,
    mediaOptions?: {
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
      messageType?: "image" | "file" | "audio";
    }
  ) => Promise<void>;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  addReaction: (messageId: string, reaction: string) => Promise<void>;
  removeReaction: (messageId: string, reaction: string) => Promise<void>;
  toggleReaction: (messageId: string, reaction: string) => Promise<void>;
  createDirectChat: (participantId: string) => Promise<Conversation>;
  createGroupChat: (name: string, memberIds: string[]) => Promise<Conversation>;
  updateGroup: (conversationId: string, input: { name?: string; avatar?: string }) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, e2eeKeyPair } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUser, setTypingUser] = useState<{ conversationId: string; userName: string } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const activeConversationRef = useRef<Conversation | null>(null);
  activeConversationRef.current = activeConversation;

  const conversationsRef = useRef<Conversation[]>([]);
  conversationsRef.current = conversations;

  // Always-fresh ref for e2eeKeyPair — avoids stale closure in async callbacks
  const e2eeKeyPairRef = useRef<CryptoKeyPair | null>(null);
  e2eeKeyPairRef.current = e2eeKeyPair;

  // Helper to robustly find the peer member in a direct conversation
  const getPeerMember = useCallback(
    (conversation: Conversation) => {
      if (!user || !conversation.members) return null;
      return conversation.members.find((m: any) => {
        const mId =
          (typeof m === "string" ? m : null) ||
          m.userId ||
          m.user?.id ||
          m.user?._id ||
          m.id ||
          m._id;
        return mId && mId.toString() !== user.id.toString();
      });
    },
    [user]
  );

  // Helper to extract a member's user ID
  const getPeerUserId = useCallback((member: any): string | null => {
    if (!member) return null;
    if (typeof member === "string") return member;
    const mId =
      member.userId ||
      member.user?.id ||
      member.user?._id ||
      member.id ||
      member._id;
    return mId ? mId.toString() : null;
  }, []);

  // Helper to obtain the peer's public key (from member object or via API)
  const getPeerPublicKey = useCallback(
    async (conversation: Conversation): Promise<string | null> => {
      if (!user) return null;
      const otherMember = getPeerMember(conversation);
      if (!otherMember) {
        console.warn("Could not find peer member in conversation:", conversation.id);
        return null;
      }

      // Check if public key is already cached on member.user or member directly
      const cachedKey = otherMember.user?.publicKey || (otherMember as any).publicKey;
      if (cachedKey) {
        return cachedKey;
      }

      const peerUserId = getPeerUserId(otherMember);
      if (!peerUserId) {
        console.warn("Could not determine peer userId from member:", otherMember);
        return null;
      }

      try {
        const data = await api.users.getPublicKey(peerUserId);
        if (data?.publicKey) {
          if (otherMember.user) {
            otherMember.user.publicKey = data.publicKey;
          } else {
            (otherMember as any).publicKey = data.publicKey;
          }
          return data.publicKey;
        }
      } catch (e) {
        console.warn("Failed to fetch peer public key for user:", peerUserId, e);
      }

      return null;
    },
    [user, getPeerMember, getPeerUserId]
  );

  // Helper to derive AES-GCM conversation key using ECDH
  const getConversationCryptoKey = useCallback(
    async (conversation: Conversation, explicitPeerKey?: string): Promise<CryptoKey | null> => {
      let keyPair = e2eeKeyPairRef.current;
      if (!keyPair?.privateKey && user) {
        try {
          const loaded = await getOrInitializeKeyPair(user.id);
          keyPair = loaded.keyPair;
          e2eeKeyPairRef.current = keyPair;
        } catch (_) {}
      }
      if (!keyPair?.privateKey) return null;

      const peerPublicKey = explicitPeerKey || (await getPeerPublicKey(conversation));
      if (!peerPublicKey) return null;

      try {
        return await deriveConversationKey(keyPair.privateKey, peerPublicKey);
      } catch (err) {
        console.error("Failed to derive conversation key:", err);
        return null;
      }
    },
    [user, getPeerPublicKey]
  );

  // Helper to decrypt a single message item locally
  const decryptMessageItem = useCallback(
    async (msg: Message, conversation: Conversation): Promise<Message> => {
      const isGroup = conversation.type?.toUpperCase() === "GROUP";

      // Group messages and pure media messages are never encrypted — use plain content
      if (isGroup || !msg.ciphertext || !msg.iv) {
        const fallbackText =
          msg.content ||
          (msg.messageType?.toLowerCase() === "image"
            ? "📷 Image"
            : msg.messageType?.toLowerCase() === "audio"
            ? "🎤 Voice message"
            : msg.mediaUrl
            ? `📎 ${msg.fileName || "Attachment"}`
            : "");
        return {
          ...msg,
          isEncrypted: false,
          decryptedContent: fallbackText,
          content: fallbackText,
        };
      }

      // If already decrypted successfully, return as-is
      if (msg.decryptedContent && !msg.decryptedContent.includes("Unable to decrypt")) {
        return msg;
      }

      // Ensure key pair is initialized
      let keyPair = e2eeKeyPairRef.current;
      if (!keyPair?.privateKey && user) {
        try {
          const loaded = await getOrInitializeKeyPair(user.id);
          keyPair = loaded.keyPair;
          e2eeKeyPairRef.current = keyPair;
        } catch (e) {
          console.warn("Could not load key pair in decryptMessageItem:", e);
        }
      }

      if (!keyPair?.privateKey) {
        return {
          ...msg,
          isEncrypted: true,
          decryptedContent: msg.content || "🔒 Unable to decrypt this message",
          content: msg.content || "🔒 Unable to decrypt this message",
        };
      }

      const myDeviceId = getOrCreateDeviceId();

      // 1. Multi-device decryption (when msg.deviceKeys is present)
      if (msg.deviceKeys && typeof msg.deviceKeys === "object" && Object.keys(msg.deviceKeys).length > 0) {
        let senderPubKey = msg.senderPublicKey || msg.sender?.publicKey || null;
        if (!senderPubKey) {
          const senderMember = conversation.members?.find(
            (m) => (m.userId || m.id) === (msg.senderId || (msg.sender as any)?.id)
          );
          senderPubKey = senderMember?.user?.publicKey || null;
        }
        if (!senderPubKey && msg.senderId) {
          try {
            const freshSender = await api.users.getPublicKey(msg.senderId);
            senderPubKey = freshSender?.publicKey || null;
          } catch (_) {}
        }

        if (senderPubKey) {
          const multiRes = await decryptMessageMultiDevice(
            msg,
            keyPair.privateKey,
            myDeviceId,
            senderPubKey
          );
          if (multiRes.success) {
            return {
              ...msg,
              isEncrypted: true,
              decryptedContent: multiRes.plaintext,
              content: multiRes.plaintext,
            };
          }
        }
      }

      // 2. Fallback: Legacy 1-to-1 ECDH decryption
      const isSender =
        user &&
        (msg.senderId?.toString() === user.id.toString() ||
          (msg.sender &&
            (msg.sender.id?.toString() === user.id.toString() ||
              (msg.sender as any)._id?.toString() === user.id.toString())));

      let peerKeyJwk = isSender
        ? (msg.recipientPublicKey || null)
        : (msg.senderPublicKey || msg.sender?.publicKey || null);

      if (!peerKeyJwk) {
        peerKeyJwk = await getPeerPublicKey(conversation);
      }

      if (!peerKeyJwk) {
        return {
          ...msg,
          isEncrypted: true,
          decryptedContent: msg.content || "🔒 Unable to decrypt this message",
          content: msg.content || "🔒 Unable to decrypt this message",
        };
      }

      try {
        let aesKey = await deriveConversationKey(keyPair.privateKey, peerKeyJwk);
        let result = await decryptMessage(msg.ciphertext, msg.iv, aesKey);

        if (result.success) {
          return {
            ...msg,
            isEncrypted: true,
            decryptedContent: result.plaintext,
            content: result.plaintext,
          };
        }

        // If decryption failed, try fetching fresh public key for the peer (in case peer updated key)
        const otherMember = getPeerMember(conversation);
        const peerUserId = getPeerUserId(otherMember) || (isSender ? undefined : msg.senderId);
        if (peerUserId) {
          const freshData = await api.users.getPublicKey(peerUserId);
          if (freshData?.publicKey && freshData.publicKey !== peerKeyJwk) {
            peerKeyJwk = freshData.publicKey;
            if (otherMember?.user) otherMember.user.publicKey = freshData.publicKey;
            aesKey = await deriveConversationKey(keyPair.privateKey, peerKeyJwk);
            result = await decryptMessage(msg.ciphertext, msg.iv, aesKey);
            if (result.success) {
              return {
                ...msg,
                isEncrypted: true,
                decryptedContent: result.plaintext,
                content: result.plaintext,
              };
            }
          }
        }

        return {
          ...msg,
          isEncrypted: true,
          decryptedContent: msg.content || "🔒 Unable to decrypt this message",
          content: msg.content || "🔒 Unable to decrypt this message",
        };
      } catch (err) {
        console.error("Decryption failed:", err);
        return {
          ...msg,
          isEncrypted: true,
          decryptedContent: msg.content || "🔒 Unable to decrypt this message",
          content: msg.content || "🔒 Unable to decrypt this message",
        };
      }
    },
    [user, getPeerMember, getPeerPublicKey, getPeerUserId]
  );


  // 1. Fetch Conversations on Login & Decrypt Latest Messages
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const data = await api.conversations.list();

      // Decrypt latestMessage previews for direct conversations
      const processedConversations = await Promise.all(
        data.conversations.map(async (conv: Conversation) => {
          if (conv.latestMessage?.ciphertext && conv.latestMessage?.iv) {
            let keyPair = e2eeKeyPairRef.current;
            if (!keyPair?.privateKey && user) {
              try {
                const loaded = await getOrInitializeKeyPair(user.id);
                keyPair = loaded.keyPair;
                e2eeKeyPairRef.current = keyPair;
              } catch (_) {}
            }

            if (keyPair?.privateKey) {
              const myDeviceId = getOrCreateDeviceId();
              // 1. Try multi-device decryption first
              if (conv.latestMessage.deviceKeys) {
                const senderKey = conv.latestMessage.senderPublicKey;
                if (senderKey) {
                  const mRes = await decryptMessageMultiDevice(
                    conv.latestMessage,
                    keyPair.privateKey,
                    myDeviceId,
                    senderKey
                  );
                  if (mRes.success) {
                    return {
                      ...conv,
                      latestMessage: {
                        ...conv.latestMessage,
                        content: mRes.plaintext,
                      },
                    };
                  }
                }
              }

              // 2. Fallback to legacy decryption
              const isSender = user && conv.latestMessage.senderId?.toString() === user.id.toString();
              const peerKey = isSender
                ? (conv.latestMessage as any).recipientPublicKey
                : (conv.latestMessage as any).senderPublicKey;
              const aesKey = await getConversationCryptoKey(conv, peerKey);
              if (aesKey) {
                const res = await decryptMessage(
                  conv.latestMessage.ciphertext,
                  conv.latestMessage.iv,
                  aesKey
                );
                if (res.success) {
                  return {
                    ...conv,
                    latestMessage: {
                      ...conv.latestMessage,
                      content: res.plaintext,
                    },
                  };
                }
              }
            }
          } else if (conv.latestMessage && !conv.latestMessage.content) {
            let fallback = "";
            if (conv.latestMessage.messageType?.toLowerCase() === "image") {
              fallback = "📷 Image";
            } else if (conv.latestMessage.messageType?.toLowerCase() === "audio") {
              fallback = "🎤 Voice message";
            } else if (conv.latestMessage.mediaUrl) {
              fallback = conv.latestMessage.fileName
                ? `📎 ${conv.latestMessage.fileName}`
                : "📎 Attachment";
            }
            if (fallback) {
              return {
                ...conv,
                latestMessage: {
                  ...conv.latestMessage,
                  content: fallback,
                },
              };
            }
          }
          return conv;
        })
      );

      setConversations(processedConversations);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user, getConversationCryptoKey]);

  useEffect(() => {
    if (user) {
      refreshConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setOnlineUsers(new Set());
    }
  }, [user, e2eeKeyPair, refreshConversations]);

  // Auto re-decrypt active conversation messages when keyPair becomes available
  useEffect(() => {
    if (!e2eeKeyPair || !activeConversation || messages.length === 0) return;
    const hasUndecrypted = messages.some(
      (m) => m.ciphertext && m.iv && (!m.decryptedContent || m.decryptedContent.includes("Unable to decrypt"))
    );
    if (hasUndecrypted) {
      Promise.all(
        messages.map((m) =>
          m.ciphertext && m.iv && (!m.decryptedContent || m.decryptedContent.includes("Unable to decrypt"))
            ? decryptMessageItem(m, activeConversation)
            : m
        )
      ).then((updated) => setMessages(updated));
    }
  }, [e2eeKeyPair, activeConversation, decryptMessageItem]);

  // 2. Register Socket.IO Listeners
  useEffect(() => {
    if (!user) return;

    // Presence initial list
    const handlePresenceList = (data: { onlineUserIds: string[] }) => {
      setOnlineUsers(new Set(data.onlineUserIds));
    };

    // User online
    const handlePresenceOnline = (data: { userId: string; userName: string }) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
    };

    // User offline
    const handlePresenceOffline = (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const notifyIncomingMessage = (message: Message, body: string) => {
      if (message.senderId === user.id) return;
      const isActiveConversation = activeConversationRef.current?.id === message.conversationId;
      if (isActiveConversation && !document.hidden) return;
      if (!("Notification" in window)) return;

      const showNotification = () => {
        if (Notification.permission !== "granted") return;
        const conversation = conversationsRef.current.find((c) => c.id === message.conversationId);
        const senderName = message.sender?.name || "New message";
        const notification = new Notification(senderName, {
          body: body || `New message in ${conversation?.name || "Zuno"}`,
          tag: `zuno-${message.conversationId}`,
          icon: "/zuno-favicon.ico",
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      };

      if (Notification.permission === "default") {
        Notification.requestPermission().then(showNotification).catch(() => undefined);
      } else {
        showNotification();
      }
    };

    // Real-time new message
    const handleNewMessage = async (newMessage: Message) => {
      let processedMessage = newMessage;
      let displayContent = newMessage.content;

      // If active conversation matches, decrypt and add to active chat
      if (activeConversationRef.current?.id === newMessage.conversationId) {
        processedMessage = await decryptMessageItem(newMessage, activeConversationRef.current);
        displayContent = processedMessage.content;

        setMessages((prev) => {
          if (prev.some((m) => m.id === processedMessage.id)) return prev;
          return [...prev, processedMessage];
        });

        // If message is from someone else, mark as read
        if (newMessage.senderId !== user?.id) {
          socketService.markAsRead(newMessage.conversationId);
        }
      } else {
        // If inactive conversation, attempt preview decryption
        const targetConv = conversationsRef.current.find((c) => c.id === newMessage.conversationId);
        if (targetConv && newMessage.ciphertext && newMessage.iv) {
          const decrypted = await decryptMessageItem(newMessage, targetConv);
          displayContent = decrypted.content;
        } else if (!displayContent) {
          if (newMessage.messageType?.toLowerCase() === "audio") {
            displayContent = "🎤 Voice message";
          } else if (
            newMessage.messageType?.toLowerCase() === "image" ||
            (newMessage.mediaUrl && !newMessage.fileName)
          ) {
            displayContent = "📷 Image";
          } else if (newMessage.mediaUrl || newMessage.messageType?.toLowerCase() === "file") {
            displayContent = `📎 ${newMessage.fileName || "Attachment"}`;
          }
        }
      }

      notifyIncomingMessage(newMessage, displayContent);

      // Update conversation list item
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === newMessage.conversationId);
        if (exists) {
          return prev.map((conv) => {
            if (conv.id === newMessage.conversationId) {
              return {
                ...conv,
                latestMessage: {
                  id: newMessage.id,
                  content: displayContent,
                  ciphertext: newMessage.ciphertext,
                  iv: newMessage.iv,
                  senderPublicKey: newMessage.senderPublicKey,
                  recipientPublicKey: newMessage.recipientPublicKey,
                  mediaUrl: newMessage.mediaUrl,
                  fileName: newMessage.fileName,
                  fileSize: newMessage.fileSize,
                  messageType: newMessage.messageType,
                  createdAt: newMessage.createdAt,
                  senderId: newMessage.senderId,
                  senderName: newMessage.sender?.name || "",
                },
                isUnread:
                  activeConversationRef.current?.id !== newMessage.conversationId &&
                  newMessage.senderId !== user?.id,
                updatedAt: newMessage.createdAt,
              };
            }
            return conv;
          });
        } else {
          // If conversation doesn't exist in local list, refresh from server
          refreshConversations();
          return prev;
        }
      });
    };

    // Real-time message read receipt
    const handleMessageRead = (data: {
      conversationId: string;
      userId: string;
      readMessageIds: string[];
      readAt: string;
    }) => {
      if (activeConversationRef.current?.id === data.conversationId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (data.readMessageIds.includes(msg.id)) {
              const alreadyRead = msg.reads.some((r) => r.userId === data.userId);
              if (!alreadyRead) {
                return {
                  ...msg,
                  reads: [...msg.reads, { userId: data.userId, readAt: data.readAt }],
                };
              }
            }
            return msg;
          })
        );
      }
    };

    // Real-time typing indicators
    const handleTypingStart = (data: { conversationId: string; userId: string; userName: string }) => {
      if (data.userId !== user.id) {
        setTypingUser({ conversationId: data.conversationId, userName: data.userName });
      }
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      setTypingUser((prev) => {
        if (prev?.conversationId === data.conversationId) return null;
        return prev;
      });
    };

    // Real-time reactions
    const handleReactionAdded = (data: {
      messageId: string;
      conversationId: string;
      userId: string;
      reaction: string;
    }) => {
      if (activeConversationRef.current?.id === data.conversationId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === data.messageId) {
              const currentReactions = msg.reactions || [];
              // A user can only have one reaction per message: remove any prior reaction by this user
              const filtered = currentReactions.filter(
                (r) => r.userId !== data.userId
              );
              return {
                ...msg,
                reactions: [
                  ...filtered,
                  {
                    messageId: data.messageId,
                    userId: data.userId,
                    reaction: data.reaction,
                    createdAt: new Date().toISOString(),
                  },
                ],
              };
            }
            return msg;
          })
        );
      }
    };

    const handleReactionRemoved = (data: {
      messageId: string;
      conversationId: string;
      userId: string;
      reaction: string;
    }) => {
      if (activeConversationRef.current?.id === data.conversationId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === data.messageId) {
              return {
                ...msg,
                reactions: (msg.reactions || []).filter(
                  (r) => r.userId !== data.userId
                ),
              };
            }
            return msg;
          })
        );
      }
    };

    const handleConversationUpdated = (updated: Conversation) => {
      if (!updated?.id) return;
      const normalized = {
        ...updated,
        type: updated.type?.toUpperCase() === "GROUP" ? "GROUP" : "DIRECT",
      } as Conversation;
      setConversations((prev) => prev.map((c) => (c.id === normalized.id ? { ...c, ...normalized } : c)));
      if (activeConversationRef.current?.id === normalized.id) {
        setActiveConversation((prev) => (prev ? { ...prev, ...normalized } : prev));
      }
    };

    socketService.on("presence:list", handlePresenceList);
    socketService.on("presence:online", handlePresenceOnline);
    socketService.on("presence:offline", handlePresenceOffline);
    socketService.on("message:new", handleNewMessage);
    socketService.on("message:read", handleMessageRead);
    socketService.on("typing:start", handleTypingStart);
    socketService.on("typing:stop", handleTypingStop);
    socketService.on("message:reaction:added", handleReactionAdded);
    socketService.on("message:reaction:removed", handleReactionRemoved);
    socketService.on("conversation:updated", handleConversationUpdated);

    return () => {
      socketService.off("presence:list", handlePresenceList);
      socketService.off("presence:online", handlePresenceOnline);
      socketService.off("presence:offline", handlePresenceOffline);
      socketService.off("message:new", handleNewMessage);
      socketService.off("message:read", handleMessageRead);
      socketService.off("typing:start", handleTypingStart);
      socketService.off("typing:stop", handleTypingStop);
      socketService.off("message:reaction:added", handleReactionAdded);
      socketService.off("message:reaction:removed", handleReactionRemoved);
      socketService.off("conversation:updated", handleConversationUpdated);
    };
  }, [user, decryptMessageItem]);

  // 3. Select Conversation & Fetch Initial History through REST & Decrypt
  const selectConversation = async (conversation: Conversation) => {
    setIsMobileSidebarOpen(false);
    if (activeConversation?.id === conversation.id) return;

    if (activeConversation) {
      socketService.leaveConversation(activeConversation.id);
    }

    setActiveConversation(conversation);
    setLoadingMessages(true);
    setTypingUser(null);

    try {
      // 1. Fetch existing messages via REST
      const data = await api.messages.getHistory(conversation.id);

      // 2. Decrypt all messages locally using derived conversation key
      const decryptedMessages = await Promise.all(
        data.messages.map((m: Message) => decryptMessageItem(m, conversation))
      );
      setMessages(decryptedMessages);

      // 3. Join Socket.IO room
      await socketService.joinConversation(conversation.id);

      // 4. Mark conversation as read in DB and broadcast read receipt
      if (conversation.isUnread) {
        await api.messages.markRead(conversation.id);
        socketService.markAsRead(conversation.id);

        setConversations((prev) =>
          prev.map((c) => (c.id === conversation.id ? { ...c, isUnread: false } : c))
        );
      }
    } catch (err) {
      console.error("Failed to load conversation messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const clearActiveConversation = () => {
    if (activeConversation) {
      socketService.leaveConversation(activeConversation.id);
    }
    setActiveConversation(null);
    setMessages([]);
    setTypingUser(null);
  };

  // 4. Send Message with Client-side E2EE
  const sendMessage = async (
    content: string,
    mediaOptions?: {
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
      messageType?: "image" | "file" | "audio";
    }
  ) => {
    if (!activeConversation) return;

    const trimmed = content?.trim() || "";
    if (!trimmed && !mediaOptions?.mediaUrl) return;

    const isDirect = activeConversation.type?.toLowerCase() === "direct";
    const messageType = mediaOptions?.messageType || "text";

    if (isDirect) {
      let ciphertext: string | undefined = undefined;
      let iv: string | undefined = undefined;
      let senderPublicKey: string | undefined = undefined;
      let recipientPublicKey: string | undefined = undefined;
      let deviceKeys: Record<string, { encryptedKey: string; iv: string }> | undefined = undefined;

      // Attempt E2EE encryption if text content exists
      if (trimmed) {
        try {
          let keyPair = e2eeKeyPairRef.current;
          if (!keyPair?.privateKey && user) {
            const initRes = await getOrInitializeKeyPair(user.id);
            keyPair = initRes.keyPair;
            e2eeKeyPairRef.current = keyPair;
          }

          if (keyPair?.privateKey && user) {
            const myDeviceId = getOrCreateDeviceId();
            const ownStored = await loadKeyPair(user.id);
            senderPublicKey = ownStored?.publicKeyJwk;

            if (senderPublicKey) {
              const otherMember = getPeerMember(activeConversation);
              const peerUserId = getPeerUserId(otherMember);

              const targetDevices: TargetDevice[] = [];
              const seenDevices = new Set<string>();

              // 1. Current sender device (for self-decryption on reload/echo)
              targetDevices.push({ deviceId: myDeviceId, publicKeyJwk: senderPublicKey });
              seenDevices.add(myDeviceId);

              // 2. Sender's other registered devices (so Device A2, etc. can decrypt)
              let myDevices = user.devices;
              if (!myDevices || myDevices.length <= 1) {
                try {
                  const meData = await api.users.getPublicKey(user.id);
                  if (meData?.devices) {
                    myDevices = meData.devices;
                    user.devices = meData.devices;
                  }
                } catch (_) {}
              }
              if (myDevices) {
                for (const dev of myDevices) {
                  if (dev.deviceId && dev.publicKey && !seenDevices.has(dev.deviceId)) {
                    targetDevices.push({ deviceId: dev.deviceId, publicKeyJwk: dev.publicKey });
                    seenDevices.add(dev.deviceId);
                  }
                }
              }

              // 3. Peer user's devices
              let peerDevices = otherMember?.user?.devices;
              let peerPrimaryPubKey = otherMember?.user?.publicKey;
              if (peerUserId && (!peerDevices || peerDevices.length === 0)) {
                try {
                  const peerData = await api.users.getPublicKey(peerUserId);
                  if (peerData?.devices && peerData.devices.length > 0) {
                    peerDevices = peerData.devices;
                  }
                  if (peerData?.publicKey) {
                    peerPrimaryPubKey = peerData.publicKey;
                  }
                } catch (_) {}
              }

              if (peerDevices && peerDevices.length > 0) {
                for (const dev of peerDevices) {
                  if (dev.deviceId && dev.publicKey && !seenDevices.has(dev.deviceId)) {
                    targetDevices.push({ deviceId: dev.deviceId, publicKeyJwk: dev.publicKey });
                    seenDevices.add(dev.deviceId);
                  }
                }
              } else if (peerPrimaryPubKey) {
                const legacyPeerDevId = `legacy_${peerUserId || "peer"}`;
                if (!seenDevices.has(legacyPeerDevId)) {
                  targetDevices.push({ deviceId: legacyPeerDevId, publicKeyJwk: peerPrimaryPubKey });
                  seenDevices.add(legacyPeerDevId);
                }
              }

              recipientPublicKey = peerPrimaryPubKey || undefined;

              // Encrypt for all target devices
              const multiEnc = await encryptMessageMultiDevice(
                trimmed,
                keyPair.privateKey,
                senderPublicKey,
                targetDevices,
                recipientPublicKey
              );

              ciphertext = multiEnc.ciphertext;
              iv = multiEnc.iv;
              senderPublicKey = multiEnc.senderPublicKey;
              recipientPublicKey = multiEnc.recipientPublicKey;
              deviceKeys = multiEnc.deviceKeys;
            } else {
              console.warn("Sender public key not found, sending without encryption.");
            }
          } else {
            console.warn("E2EE key pair not initialized, sending without encryption.");
          }
        } catch (cryptoErr) {
          // Encryption failed — degrade gracefully and send as plain text
          console.warn("Message encryption failed, sending as plaintext:", cryptoErr);
          ciphertext = undefined;
          iv = undefined;
          deviceKeys = undefined;
        }
      }

      // TRUE E2EE: When encrypted, content is "" so the server NEVER sees plaintext!
      try {
        await socketService.sendMessage({
          conversationId: activeConversation.id,
          content: ciphertext ? "" : trimmed,
          ciphertext,
          iv,
          senderPublicKey,
          recipientPublicKey,
          deviceKeys,
          mediaUrl: mediaOptions?.mediaUrl,
          fileName: mediaOptions?.fileName,
          fileSize: mediaOptions?.fileSize,
          messageType,
        });
      } catch (socketErr) {
        console.error("Message send failed", socketErr);
        throw socketErr;
      }

    } else {
      // Group conversation fallback
      try {
        await socketService.sendMessage({
          conversationId: activeConversation.id,
          content: trimmed,
          mediaUrl: mediaOptions?.mediaUrl,
          fileName: mediaOptions?.fileName,
          fileSize: mediaOptions?.fileSize,
          messageType,
        });
      } catch (socketErr) {
        console.error("Message send failed", socketErr);
        throw socketErr;
      }
    }

    sendTypingStop();
  };

  // 5. Typing Indicator Helpers
  const sendTypingStart = () => {
    if (activeConversation) {
      socketService.startTyping(activeConversation.id);
    }
  };

  const sendTypingStop = () => {
    if (activeConversation) {
      socketService.stopTyping(activeConversation.id);
    }
  };

  // 6. Reactions with Optimistic UI & Socket/REST Fallback (One reaction per user per message)
  const addReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    const currentUserId = user.id;

    const targetMsg = messages.find((m) => m.id === messageId);
    const originalReactions = targetMsg?.reactions ? [...targetMsg.reactions] : [];

    // 1. Optimistic update: Replace any previous reaction from this user with the new one
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const currentReactions = msg.reactions || [];
          const filtered = currentReactions.filter(
            (r) => r.userId !== currentUserId
          );
          return {
            ...msg,
            reactions: [
              ...filtered,
              {
                messageId,
                userId: currentUserId,
                reaction,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }
        return msg;
      })
    );

    // 2. Network update with Socket primary and REST fallback
    try {
      if (socketService.isConnected()) {
        await socketService.addReaction(messageId, reaction);
      } else {
        await api.messages.addReaction(messageId, reaction);
      }
    } catch (socketErr) {
      console.warn("Socket addReaction failed, trying REST fallback:", socketErr);
      try {
        await api.messages.addReaction(messageId, reaction);
      } catch (restErr) {
        console.error("Failed to add reaction:", restErr);
        // Rollback optimistic update
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              return { ...msg, reactions: originalReactions };
            }
            return msg;
          })
        );
      }
    }
  };

  const removeReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    const currentUserId = user.id;

    // 1. Capture snapshot for rollback
    const targetMsg = messages.find((m) => m.id === messageId);
    const originalReactions = targetMsg?.reactions ? [...targetMsg.reactions] : [];

    // 2. Optimistic update: remove user's reaction from this message
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            reactions: (msg.reactions || []).filter(
              (r) => r.userId !== currentUserId
            ),
          };
        }
        return msg;
      })
    );

    // 3. Network update with Socket primary and REST fallback
    try {
      if (socketService.isConnected()) {
        await socketService.removeReaction(messageId, reaction);
      } else {
        await api.messages.removeReaction(messageId, reaction);
      }
    } catch (socketErr) {
      console.warn("Socket removeReaction failed, trying REST fallback:", socketErr);
      try {
        await api.messages.removeReaction(messageId, reaction);
      } catch (restErr) {
        console.error("Failed to remove reaction:", restErr);
        // Rollback optimistic update
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              return { ...msg, reactions: originalReactions };
            }
            return msg;
          })
        );
      }
    }
  };

  const toggleReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === messageId);
    const existingUserReaction = (msg?.reactions || []).find(
      (r) => r.userId === user.id
    );

    if (existingUserReaction) {
      if (existingUserReaction.reaction === reaction) {
        // Clicked the exact same emoji -> remove it (toggle off)
        await removeReaction(messageId, reaction);
      } else {
        // Clicked a different emoji -> switch/replace with new emoji
        await addReaction(messageId, reaction);
      }
    } else {
      // First reaction -> add it
      await addReaction(messageId, reaction);
    }
  };

  // 7. Create Direct Chat
  const createDirectChat = async (participantId: string): Promise<Conversation> => {
    const data = await api.conversations.createDirect(participantId);
    await refreshConversations();
    const created = data.conversation;
    const otherMember = created.members?.find((m: any) => {
      const mId =
        (typeof m === "string" ? m : null) ||
        m.userId ||
        m.user?.id ||
        m.user?._id ||
        m.id ||
        m._id;
      return mId && mId.toString() !== user?.id.toString();
    });
    const formatted: Conversation = {
      id: created.id || created._id,
      type: created.type?.toUpperCase() === "GROUP" ? "GROUP" : "DIRECT",
      name: created.name || otherMember?.user?.name || otherMember?.name || "Direct Chat",
      avatar: created.avatar || otherMember?.user?.avatar || otherMember?.avatar || null,
      createdBy: created.createdBy || null,
      members: created.members,
      latestMessage: null,
      isUnread: false,
      updatedAt: created.updatedAt || new Date().toISOString(),
    };
    selectConversation(formatted);
    return formatted;
  };

  // 8. Create Group Chat
  const createGroupChat = async (name: string, memberIds: string[]): Promise<Conversation> => {
    const data = await api.conversations.createGroup(name, memberIds);
    await refreshConversations();
    const created = data.conversation;
    const formatted: Conversation = {
      id: created.id,
      type: "GROUP",
      name: created.name,
      avatar: null,
      createdBy: created.createdBy || null,
      members: created.members,
      latestMessage: null,
      isUnread: false,
      updatedAt: created.updatedAt,
    };
    selectConversation(formatted);
    return formatted;
  };

  const deleteConversation = async (conversationId: string): Promise<void> => {
    await api.conversations.delete(conversationId);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversationRef.current?.id === conversationId) {
      setActiveConversation(null);
      setMessages([]);
      setIsMobileSidebarOpen(true);
    }
  };

  const updateGroup = async (
    conversationId: string,
    input: { name?: string; avatar?: string }
  ): Promise<void> => {
    const data = await api.conversations.updateGroup(conversationId, input);
    const updated = data.conversation as Conversation;
    const normalized = {
      ...(conversationsRef.current.find((c) => c.id === conversationId) || {}),
      ...updated,
      id: updated.id || conversationId,
      type: updated.type?.toUpperCase() === "GROUP" ? "GROUP" : "DIRECT",
      createdBy: updated.createdBy || null,
    } as Conversation;
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, ...normalized } : c)));
    if (activeConversationRef.current?.id === conversationId) {
      setActiveConversation((prev) => (prev ? { ...prev, ...normalized } : prev));
    }
  };

  const deleteAllConversations = async (): Promise<void> => {
    await api.conversations.deleteAll();
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    setIsMobileSidebarOpen(true);
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loadingConversations,
        loadingMessages,
        onlineUsers,
        typingUser,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        selectConversation,
        clearActiveConversation,
        sendMessage,
        sendTypingStart,
        sendTypingStop,
        addReaction,
        removeReaction,
        toggleReaction,
        createDirectChat,
        createGroupChat,
        updateGroup,
        deleteConversation,
        deleteAllConversations,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
