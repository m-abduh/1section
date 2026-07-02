import { z } from "zod";

export const createReviewSchema = z.object({
  moduleSlug: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(5000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
