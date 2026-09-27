import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessage extends Document {
  id: string;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content?: string;
  ciphertext?: string;
  iv?: string;
  senderPublicKey?: string | null;
  recipientPublicKey?: string | null;
  deviceKeys?: Record<string, { encryptedKey: string; iv: string }> | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  messageType: "text" | "image" | "file" | "audio";
  replyTo?: Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, default: "" },
    ciphertext: { type: String, default: null },
    iv: { type: String, default: null },
    senderPublicKey: { type: String, default: null },
    recipientPublicKey: { type: String, default: null },
    deviceKeys: { type: Schema.Types.Mixed, default: null },
    mediaUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
    messageType: { type: String, enum: ["text", "image", "file", "audio"], default: "text" },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.conversationId = ret.conversationId?.toString();
        ret.senderPublicKey = ret.senderPublicKey || null;
        ret.recipientPublicKey = ret.recipientPublicKey || null;
        ret.deviceKeys = ret.deviceKeys || null;
        const sId = ret.senderId;
        if (sId && typeof sId === "object") {
          const actualId = (sId._id || sId.id || sId)?.toString();
          if (sId.name !== undefined) {
            ret.sender = {
              id: actualId,
              name: sId.name,
              email: sId.email,
              avatar: sId.avatar,
              publicKey: sId.publicKey || null,
            };
            ret.senderId = actualId;
          } else {
            ret.senderId = actualId;
          }
        } else if (ret.senderId) {
          ret.senderId = ret.senderId.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.conversationId = ret.conversationId?.toString();
        ret.senderPublicKey = ret.senderPublicKey || null;
        ret.recipientPublicKey = ret.recipientPublicKey || null;
        ret.deviceKeys = ret.deviceKeys || null;
        const sId = ret.senderId;
        if (sId && typeof sId === "object") {
          const actualId = (sId._id || sId.id || sId)?.toString();
          if (sId.name !== undefined) {
            ret.sender = {
              id: actualId,
              name: sId.name,
              email: sId.email,
              avatar: sId.avatar,
              publicKey: sId.publicKey || null,
            };
            ret.senderId = actualId;
          } else {
            ret.senderId = actualId;
          }
        } else if (ret.senderId) {
          ret.senderId = ret.senderId.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const MessageModel = mongoose.model<IMessage>("Message", MessageSchema);
