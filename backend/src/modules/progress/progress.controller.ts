import { Response, NextFunction } from "express";
import { ProgressService } from "./progress.service";
import type { AuthRequest } from "../../types";
import type { UpdateProgressInput } from "./progress.schema";

export namespace ProgressController {
  export async function getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const progress = await ProgressService.getAll(req.user!.userId);
      res.json(progress);
    } catch (err) {
      next(err);
    }
  }

  export async function getBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const progress = await ProgressService.getBySlug(req.user!.userId, slug);
      res.json(progress);
    } catch (err) {
      next(err);
    }
  }

  export async function upsert(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const body = req.body as UpdateProgressInput;
      const progress = await ProgressService.upsert(req.user!.userId, slug, body);
      res.json(progress);
    } catch (err) {
      next(err);
    }
  }

  export async function getContinueLearning(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await ProgressService.getContinueLearning(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await ProgressService.getStats(req.user!.userId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  export async function getStreak(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await ProgressService.getStreak(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function resetStreak(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await ProgressService.resetStreak(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

}
