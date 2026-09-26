import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessageRead extends Document {
  id: string;
  messageId: Types.ObjectId;
  userId: Types.ObjectId;
  readAt: Date;
}

const MessageReadSchema = new Schema<IMessageRead>(
  {
    messageId: { type: Schema.Types.ObjectId, ref: "Message", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    readAt: { type: Date, default: Date.now },
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

MessageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });

export const MessageReadModel = mongoose.model<IMessageRead>("MessageRead", MessageReadSchema);
