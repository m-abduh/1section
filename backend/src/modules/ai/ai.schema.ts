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

// Basic cron expression validation: 5 or 6 space-separated fields
// Supports standard (5-field) and with-seconds (6-field) cron expressions
const cronRegex = /^(\S+\s){4,5}\S+$/;

export const scheduleSchema = z.object({
  expression: z.string().regex(cronRegex, "Must be a valid cron expression (5 or 6 space-separated fields)"),
  category: z.string().optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;
export type AutoGenerateInput = z.infer<typeof autoGenerateSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
