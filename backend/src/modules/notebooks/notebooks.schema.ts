import { z } from "zod";

export const upsertNotebookSchema = z.object({
  moduleSlug: z.string().min(1),
  nodeId: z.string().min(1),
  nodeLabel: z.string().min(1),
  slideIndex: z.number().int().min(0),
  slideContent: z.string().max(10000),
  content: z.string().max(5000),
});

export const deleteNotebookSchema = z.object({
  moduleSlug: z.string().min(1),
  nodeId: z.string().min(1),
  slideIndex: z.number().int().min(0),
});

export type UpsertNotebookInput = z.infer<typeof upsertNotebookSchema>;
export type DeleteNotebookInput = z.infer<typeof deleteNotebookSchema>;
