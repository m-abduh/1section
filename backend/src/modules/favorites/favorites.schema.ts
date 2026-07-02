import { z } from "zod";

export const addFavoriteSchema = z.object({
  moduleSlug: z.string().min(1),
});

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
