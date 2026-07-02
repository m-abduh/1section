import { z } from "zod";

export const createCheckoutSchema = z.object({});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
