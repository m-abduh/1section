import { Response } from "express";
import { ProgressService } from "./progress.service";
import type { AuthRequest } from "../../types";
import type { UpdateProgressInput } from "./progress.schema";
import { asyncHandler } from "../../lib/async-handler";

export namespace ProgressController {
  export const getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const progress = await ProgressService.getAll(req.user!.userId);
    res.json(progress);
  });

  export const getBySlug = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const progress = await ProgressService.getBySlug(req.user!.userId, slug);
    res.json(progress);
  });

  export const upsert = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const body = req.body as UpdateProgressInput;
    const progress = await ProgressService.upsert(req.user!.userId, slug, body);
    res.json(progress);
  });

  export const getContinueLearning = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await ProgressService.getContinueLearning(req.user!.userId);
    res.json(result);
  });

  export const getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await ProgressService.getStats(req.user!.userId);
    res.json(stats);
  });

  export const getStreak = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await ProgressService.getStreak(req.user!.userId);
    res.json(result);
  });

  export const resetStreak = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await ProgressService.resetStreak(req.user!.userId);
    res.json(result);
  });
}
