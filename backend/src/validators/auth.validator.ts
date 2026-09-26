import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(50),
  chatId: z
    .string()
    .transform((val) => val.trim().toLowerCase().replace(/^@/, ""))
    .pipe(
      z
        .string()
        .min(3, "Chat ID must be at least 3 characters")
        .max(30, "Chat ID must be at most 30 characters")
        .regex(
          /^[a-z][a-z0-9._]{2,29}$/,
          "Chat ID must start with a letter and contain only lowercase letters, numbers, dots, or underscores"
        )
    ),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  avatar: z.string().url("Avatar must be a valid URL").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
