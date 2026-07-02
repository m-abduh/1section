import { z } from "zod";

export const createReflectionSchema = z.object({
  moduleSlug: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
});

export const updateReflectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
});

export type CreateReflectionInput = z.infer<typeof createReflectionSchema>;
export type UpdateReflectionInput = z.infer<typeof updateReflectionSchema>;
