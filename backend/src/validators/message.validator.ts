import { z } from "zod";

export const sendMessageSchema = z
  .object({
    content: z.string().max(4000).optional().default(""),
    ciphertext: z.string().min(1).optional(),
    iv: z.string().min(1).optional(),
    senderPublicKey: z.string().optional(),
    recipientPublicKey: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    fileName: z.string().max(255).optional(),
    fileSize: z.number().nonnegative().optional(),
    messageType: z
      .preprocess(
        (val) => (typeof val === "string" ? val.toLowerCase() : val),
        z.enum(["text", "image", "file", "audio"])
      )
      .default("text"),
  })
  .refine(
    (data) =>
      (data.ciphertext && data.iv) ||
      (data.content && data.content.trim().length > 0) ||
      Boolean(data.mediaUrl),
    {
      message:
        "Message must contain either encrypted payload (ciphertext & iv), content, or mediaUrl",
    }
  );

export const editMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(4000, "Message too long"),
});

export const addReactionSchema = z.object({
  reaction: z.string().min(1).max(32, "Invalid reaction emoji"),
});

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
