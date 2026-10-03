import mongoose, { Schema, Document } from "mongoose";

export interface IDeviceKey {
  deviceId: string;
  publicKey: string;
  deviceName?: string;
  lastActive: Date;
}

export interface IUser extends Document {
  id: string;
  name: string;
  chatId: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  publicKey?: string;
  devices?: IDeviceKey[];
  isVerified: boolean;
  isDeactivated?: boolean;
  deactivatedAt?: Date;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    chatId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[a-z][a-z0-9._]{2,29}$/, "Chat ID must start with a letter, be 3-30 chars, and contain only lowercase letters, numbers, dots, or underscores"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    avatar: { type: String },
    publicKey: { type: String, default: null },
    devices: [
      {
        deviceId: { type: String, required: true },
        publicKey: { type: String, required: true },
        deviceName: { type: String, default: "Browser" },
        lastActive: { type: Date, default: Date.now },
      },
    ],
    isVerified: { type: Boolean, default: false },
    isDeactivated: { type: Boolean, default: false },
    deactivatedAt: { type: Date, default: null },
    verificationToken: { type: String, default: null },
    verificationTokenExpiry: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetTokenExpiry: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.devices = (ret.devices || []).map((d: any) => ({
          deviceId: d.deviceId,
          publicKey: d.publicKey,
          deviceName: d.deviceName,
          lastActive: d.lastActive,
        }));
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.verificationToken;
        delete ret.verificationTokenExpiry;
        delete ret.passwordResetToken;
        delete ret.passwordResetTokenExpiry;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.devices = (ret.devices || []).map((d: any) => ({
          deviceId: d.deviceId,
          publicKey: d.publicKey,
          deviceName: d.deviceName,
          lastActive: d.lastActive,
        }));
        delete ret._id;
        delete ret.__v;
        delete ret.passwordResetToken;
        delete ret.passwordResetTokenExpiry;
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);
