import { z } from "zod";

export const generateSchema = z.object({
  mode: z.enum(["questions", "graph"]),
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
});

export const autoGenerateSchema = z.object({
  category: z.string().optional(),
});

export const scheduleSchema = z.object({
  expression: z.string().min(1),
  category: z.string().optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;
export type AutoGenerateInput = z.infer<typeof autoGenerateSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const generateExample: GenerateInput = {
  mode: "questions",
  title: "The Art of Deep Focus",
  description: "Learn how to achieve deep focus",
  content: "Markdown content here...",
};

export const autoGenerateExample: AutoGenerateInput = {
  category: "focus",
};

export const scheduleExample: ScheduleInput = {
  expression: "0 9 * * 1",
  category: "productivity",
};
