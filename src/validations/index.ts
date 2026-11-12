import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(
        /[A-Z]/,
        "Password must contain at least one uppercase letter",
      )
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/\d/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const noteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  category: z.string().max(50).optional().nullable(),
  tags: z.array(z.string().max(30)).optional().default([]),
  isPinned: z.boolean().optional().default(false),
  isArchived: z.boolean().optional().default(false),
});

export const noteIdSchema = z.object({
  id: z.string().uuid("Invalid note ID"),
});

export const userRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

export const userStatusSchema = z.object({
  status: z.enum(["active", "disabled"]),
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
