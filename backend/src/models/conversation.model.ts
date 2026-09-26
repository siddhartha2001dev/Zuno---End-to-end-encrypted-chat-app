import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConversation extends Document {
  id: string;
  type: "direct" | "group";
  name?: string;
  avatar?: string;
  members: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    type: { type: String, enum: ["direct", "group"], default: "direct", required: true },
    name: { type: String, trim: true },
    avatar: { type: String },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
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

ConversationSchema.index({ members: 1 });
ConversationSchema.index({ updatedAt: -1 });

export const ConversationModel = mongoose.model<IConversation>("Conversation", ConversationSchema);
