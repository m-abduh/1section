import { Response } from "express";
import { AiService } from "./ai.service";
import { AiCron } from "./ai.cron";
import type { AuthRequest } from "../../types";
import { asyncHandler } from "../../lib/async-handler";

export namespace AiController {
  export const generate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { mode, title, description, content } = req.body;
    const result = await AiService.generate(mode, title, description, content);
    res.json(result);
  });

  export const getCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
    const info = await AiService.getCategoriesInfo();
    res.json(info);
  });

  export const triggerAutoGenerate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category } = req.body || {};
    const module = await AiCron.triggerOnce(category);
    res.status(201).json(module);
  });

  export const getSchedule = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const schedule = await AiCron.getSchedule();
    res.json(schedule || { isActive: false });
  });

  export const setSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { expression, category } = req.body;
    await AiCron.start(expression, category);
    res.json({ success: true, expression, category: category || null });
  });

  export const deleteSchedule = asyncHandler(async (_req: AuthRequest, res: Response) => {
    await AiCron.stop();
    res.json({ success: true });
  });
}
