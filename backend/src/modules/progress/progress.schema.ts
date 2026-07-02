import { z } from "zod";

export const updateProgressSchema = z.object({
  nodeId: z.string().optional(),
  listeningProgress: z.number().min(0).max(100).optional(),
  readingProgress: z.number().min(0).max(100).optional(),
  scrollPosition: z.number().min(0).optional(),
  currentCharIndex: z.number().min(0).optional(),
  audioRate: z.number().min(0.5).max(3).optional(),
  completed: z.boolean().optional(),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
