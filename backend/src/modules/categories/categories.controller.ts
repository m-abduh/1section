import { Response } from "express";
import { CategoriesService } from "./categories.service";
import type { AuthRequest } from "../../types";
import { asyncHandler } from "../../lib/async-handler";

export namespace CategoriesController {
  export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, search } = req.query;
    const result = await CategoriesService.list({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string | undefined,
    });
    res.json(result);
  });

  export const listAll = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const categories = await CategoriesService.listAll();
    res.json(categories);
  });

  export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const category = await CategoriesService.getById(id);
    res.json(category);
  });

  export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await CategoriesService.create(req.body);
    res.status(201).json(category);
  });

  export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const category = await CategoriesService.update(id, req.body);
    res.json(category);
  });

  export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    await CategoriesService.remove(id);
    res.json({ success: true });
  });
}
