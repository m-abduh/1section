import { Response } from "express";
import { NotebooksService } from "./notebooks.service";
import type { AuthRequest } from "../../types";
import type { UpsertNotebookInput } from "./notebooks.schema";
import { asyncHandler } from "../../lib/async-handler";

export namespace NotebooksController {
  export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const entries = await NotebooksService.list(req.user!.userId);
    res.json(entries);
  });

  export const getBySlide = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { moduleSlug, nodeId, slideIndex } = req.params as Record<string, string>;
    const entry = await NotebooksService.getBySlide(
      req.user!.userId,
      moduleSlug,
      nodeId,
      parseInt(slideIndex),
    );
    res.json(entry);
  });

  export const upsert = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as UpsertNotebookInput;
    const entry = await NotebooksService.upsert(req.user!.userId, body);
    res.json(entry);
  });

  export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { moduleSlug, nodeId, slideIndex } = req.params as Record<string, string>;
    const result = await NotebooksService.remove(
      req.user!.userId,
      moduleSlug,
      nodeId,
      parseInt(slideIndex),
    );
    res.json(result);
  });
}
