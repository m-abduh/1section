import { z } from "zod";

export const moduleNodeSchema = z.object({
  id: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  label: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  content: z.array(z.string()).optional(),
  type: z.string().optional().default("custom"),
  style: z.any().optional(),
});

export const moduleEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  animated: z.boolean().optional().default(true),
});

export const moduleQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctAnswer: z.number().int().min(0),
  explanation: z.string().optional().default(""),
});

export const createModuleSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  isPremium: z.boolean().optional().default(true),
  isDraft: z.boolean().optional().default(true),
  nodes: z.array(moduleNodeSchema).optional().default([]),
  edges: z.array(moduleEdgeSchema).optional().default([]),
  questions: z.array(moduleQuestionSchema).optional().default([]),
}).refine((d) => d.category || d.categoryId, {
  message: "Either category or categoryId is required",
});

export const updateModuleSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  categoryId: z.string().optional(),
  isPremium: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  nodes: z.array(moduleNodeSchema).optional(),
  edges: z.array(moduleEdgeSchema).optional(),
  questions: z.array(moduleQuestionSchema).optional(),
});