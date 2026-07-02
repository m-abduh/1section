import { z } from "zod";

export const createActionSchema = z.object({
  moduleSlug: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.array(z.object({
    id: z.number(),
    type: z.string(),
    label: z.string(),
    value: z.any(),
    options: z.array(z.string()).optional(),
  })),
});

export const updateActionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.array(z.object({
    id: z.number(),
    type: z.string(),
    label: z.string(),
    value: z.any(),
    options: z.array(z.string()).optional(),
  })).optional(),
  completed: z.boolean().optional(),
});

export type CreateActionInput = z.infer<typeof createActionSchema>;
export type UpdateActionInput = z.infer<typeof updateActionSchema>;
