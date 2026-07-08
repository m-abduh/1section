import { Response, NextFunction } from "express";
import { AiService } from "./ai.service";
import { AiCron } from "./ai.cron";
import type { AuthRequest } from "../../types";

export namespace AiController {
  export async function generate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { mode, title, description, content } = req.body;
      const result = await AiService.generate(mode, title, description, content);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function getCategories(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const info = await AiService.getCategoriesInfo();
      res.json(info);
    } catch (err) {
      next(err);
    }
  }

  export async function triggerAutoGenerate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { category } = req.body || {};
      const module = await AiCron.triggerOnce(category);
      res.status(201).json(module);
    } catch (err: any) {
      console.error(`[AI Controller] ${err.statusCode || 500}: ${err.message}`);
      next(err);
    }
  }

  export async function getSchedule(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schedule = await AiCron.getSchedule();
      res.json(schedule || { isActive: false });
    } catch (err) {
      next(err);
    }
  }

  export async function setSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { expression, category } = req.body;
      await AiCron.start(expression, category);
      res.json({ success: true, expression, category: category || null });
    } catch (err: any) {
      res.status(400).json({ error: { message: `Jadwal tidak valid: ${err.message}`, statusCode: 400 } });
    }
  }

  export async function deleteSchedule(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await AiCron.stop();
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}
