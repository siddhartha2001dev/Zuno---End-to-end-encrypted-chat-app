import { z } from "zod";

export const createDirectConversationSchema = z.object({
  participantId: z.string().min(12, "Invalid participant ID"),
});

export const createGroupConversationSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters").max(50),
  memberIds: z.array(z.string().min(12, "Invalid member ID")).min(1, "Group must have at least one member"),
});

export const addMemberSchema = z.object({
  userId: z.string().min(12, "Invalid user ID"),
});

export type CreateDirectConversationInput = z.infer<typeof createDirectConversationSchema>;
export type CreateGroupConversationInput = z.infer<typeof createGroupConversationSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
