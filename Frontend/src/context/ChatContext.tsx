import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { Conversation, Message } from "../types";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import { useAuth } from "./AuthContext";
import { deriveConversationKey } from "../crypto/keyExchange";
import { encryptMessage } from "../crypto/encryption";
import { decryptMessage } from "../crypto/decryption";

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
      messageType?: "image" | "file";
    }
  ) => Promise<void>;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  addReaction: (messageId: string, reaction: string) => Promise<void>;
  createDirectChat: (participantId: string) => Promise<Conversation>;
  createGroupChat: (name: string, memberIds: string[]) => Promise<Conversation>;
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
    async (conversation: Conversation): Promise<CryptoKey | null> => {
      if (!e2eeKeyPair?.privateKey) return null;
      const peerPublicKey = await getPeerPublicKey(conversation);
      if (!peerPublicKey) return null;

      try {
        return await deriveConversationKey(e2eeKeyPair.privateKey, peerPublicKey, conversation.id);
      } catch (err) {
        console.error("Failed to derive conversation key:", err);
        return null;
      }
    },
    [e2eeKeyPair, getPeerPublicKey]
  );

  // Helper to decrypt a single message item locally
  const decryptMessageItem = useCallback(
    async (msg: Message, conversation: Conversation): Promise<Message> => {
      // Message without ciphertext (or pure media message)
      if (!msg.ciphertext || !msg.iv) {
        const fallbackText =
          msg.content ||
          (msg.messageType?.toLowerCase() === "image"
            ? "📷 Image"
            : msg.mediaUrl
            ? "📎 Attachment"
            : "");
        return {
          ...msg,
          isEncrypted: false,
          decryptedContent: fallbackText,
          content: fallbackText,
        };
      }

      const aesKey = await getConversationCryptoKey(conversation);
      if (!aesKey) {
        return {
          ...msg,
          isEncrypted: true,
          decryptedContent: "🔒 Unable to decrypt this message",
          content: "🔒 Unable to decrypt this message",
        };
      }

      const result = await decryptMessage(msg.ciphertext, msg.iv, aesKey);
      return {
        ...msg,
        isEncrypted: true,
        decryptedContent: result.plaintext,
        content: result.plaintext,
      };
    },
    [getConversationCryptoKey]
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
            const aesKey = await getConversationCryptoKey(conv);
            if (aesKey) {
              const res = await decryptMessage(
                conv.latestMessage.ciphertext,
                conv.latestMessage.iv,
                aesKey
              );
              return {
                ...conv,
                latestMessage: {
                  ...conv.latestMessage,
                  content: res.plaintext,
                },
              };
            }
          } else if (conv.latestMessage && !conv.latestMessage.content) {
            let fallback = "";
            if (conv.latestMessage.messageType?.toLowerCase() === "image") {
              fallback = "📷 Image";
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
  }, [user, refreshConversations]);

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
          if (
            newMessage.messageType?.toLowerCase() === "image" ||
            (newMessage.mediaUrl && !newMessage.fileName)
          ) {
            displayContent = "📷 Image";
          } else if (newMessage.mediaUrl || newMessage.messageType?.toLowerCase() === "file") {
            displayContent = `📎 ${newMessage.fileName || "Attachment"}`;
          }
        }
      }

      // Update conversation list item
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === newMessage.conversationId) {
            return {
              ...conv,
              latestMessage: {
                id: newMessage.id,
                content: displayContent,
                ciphertext: newMessage.ciphertext,
                iv: newMessage.iv,
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
        })
      );
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
              const filtered = msg.reactions.filter(
                (r) => !(r.userId === data.userId && r.reaction === data.reaction)
              );
              return {
                ...msg,
                reactions: [...filtered, { messageId: data.messageId, userId: data.userId, reaction: data.reaction }],
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
                reactions: msg.reactions.filter(
                  (r) => !(r.userId === data.userId && r.reaction === data.reaction)
                ),
              };
            }
            return msg;
          })
        );
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
      messageType?: "image" | "file";
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

      // Only perform encryption if there is text content
      if (trimmed) {
        // 1. Validate identity key pair exists on current client device
        if (!e2eeKeyPair?.privateKey) {
          throw new Error("E2EE key pair is not initialized on this device.");
        }

        // 2. Obtain recipient's public key
        const peerPublicKey = await getPeerPublicKey(activeConversation);
        if (!peerPublicKey) {
          throw new Error(
            "Cannot send encrypted message: Recipient has not registered an E2EE public key yet."
          );
        }

        // 3. Derive conversation AES-GCM key and encrypt locally with fresh 12-byte IV
        try {
          const aesKey = await deriveConversationKey(
            e2eeKeyPair.privateKey,
            peerPublicKey,
            activeConversation.id
          );
          const encrypted = await encryptMessage(trimmed, aesKey);
          ciphertext = encrypted.ciphertext;
          iv = encrypted.iv;
        } catch (cryptoErr) {
          console.error("Message encryption failed", cryptoErr);
          throw cryptoErr;
        }
      }

      // 4. Send payload via Socket.IO
      try {
        await socketService.sendMessage({
          conversationId: activeConversation.id,
          ciphertext,
          iv,
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

  // 6. Reactions
  const addReaction = async (messageId: string, reaction: string) => {
    await socketService.addReaction(messageId, reaction);
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
        createDirectChat,
        createGroupChat,
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
