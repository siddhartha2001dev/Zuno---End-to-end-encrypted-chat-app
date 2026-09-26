import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessageReaction extends Document {
  id: string;
  messageId: Types.ObjectId;
  userId: Types.ObjectId;
  reaction: string;
  createdAt: Date;
}

const MessageReactionSchema = new Schema<IMessageReaction>(
  {
    messageId: { type: Schema.Types.ObjectId, ref: "Message", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reaction: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.messageId = ret.messageId.toString();
        ret.userId = ret.userId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

MessageReactionSchema.index({ messageId: 1, userId: 1, reaction: 1 }, { unique: true });

export const MessageReactionModel = mongoose.model<IMessageReaction>("MessageReaction", MessageReactionSchema);
