import { Response, NextFunction } from "express";
import { NotebooksService } from "./notebooks.service";
import type { AuthRequest } from "../../types";
import type { UpsertNotebookInput } from "./notebooks.schema";

export namespace NotebooksController {
  export async function list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const entries = await NotebooksService.list(req.user!.userId);
      res.json(entries);
    } catch (err) {
      next(err);
    }
  }

  export async function getBySlide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { moduleSlug, nodeId, slideIndex } = req.params as Record<string, string>;
      const entry = await NotebooksService.getBySlide(
        req.user!.userId,
        moduleSlug,
        nodeId,
        parseInt(slideIndex),
      );
      res.json(entry);
    } catch (err) {
      next(err);
    }
  }

  export async function upsert(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as UpsertNotebookInput;
      const entry = await NotebooksService.upsert(req.user!.userId, body);
      res.json(entry);
    } catch (err) {
      next(err);
    }
  }

  export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { moduleSlug, nodeId, slideIndex } = req.params as Record<string, string>;
      const result = await NotebooksService.remove(
        req.user!.userId,
        moduleSlug,
        nodeId,
        parseInt(slideIndex),
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
