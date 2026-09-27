export interface DeviceInfo {
  deviceId: string;
  publicKey: string;
  deviceName?: string;
  lastActive: string;
}

export interface User {
  id: string;
  name: string;
  chatId: string;
  email: string;
  avatar: string | null;
  publicKey?: string | null;
  devices?: DeviceInfo[];
  createdAt?: string;
}

export interface ConversationMember {
  id: string;
  userId: string;
  role: "MEMBER" | "ADMIN";
  joinedAt: string;
  user: User;
}

export interface MessageReaction {
  id?: string;
  messageId: string;
  userId: string;
  reaction: string;
  createdAt?: string;
}

export interface MessageRead {
  userId: string;
  readAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  ciphertext?: string | null;
  iv?: string | null;
  senderPublicKey?: string | null;
  recipientPublicKey?: string | null;
  deviceKeys?: Record<string, { encryptedKey: string; iv: string }> | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  isEncrypted?: boolean;
  decryptedContent?: string;
  messageType: "TEXT" | "IMAGE" | "FILE" | "AUDIO" | "text" | "image" | "file" | "audio";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  sender?: User;
  reads: MessageRead[];
  reactions: MessageReaction[];
  status?: "sending" | "sent" | "delivered" | "read";
}

export interface Conversation {
  id: string;
  type: "DIRECT" | "GROUP" | "direct" | "group";
  name: string | null;
  avatar: string | null;
  members: ConversationMember[];
  latestMessage: {
    id: string;
    content?: string;
    ciphertext?: string | null;
    iv?: string | null;
    senderPublicKey?: string | null;
    recipientPublicKey?: string | null;
    deviceKeys?: Record<string, { encryptedKey: string; iv: string }> | null;
    mediaUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    messageType?: string;
    createdAt: string;
    senderId: string;
    senderName: string;
  } | null;
  isUnread: boolean;
  updatedAt: string;
}
