import { Response } from "express";
import { ModulesService } from "./modules.service";
import type { AuthRequest } from "../../types";
import { asyncHandler } from "../../lib/async-handler";

export namespace ModulesController {
  export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, category, categories, search, preferred } = req.query;
    const isAdmin = req.user?.role === "ADMIN";

    const result = await ModulesService.list({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      category: category as string | undefined,
      categories: categories as string | undefined,
      search: search as string | undefined,
      userId: req.user?.userId,
      admin: isAdmin,
      preferred: preferred === "true",
    });
    res.json(result);
  });

  export const getBySlug = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const isAdmin = req.user?.role === "ADMIN";
    const mod = await ModulesService.getBySlug(slug, req.user?.userId, isAdmin);
    res.json(mod);
  });

  export const getDailyFree = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const mod = await ModulesService.getDailyFree();
    res.json(mod);
  });

  export const checkAccess = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const result = await ModulesService.checkAccess(slug, req.user?.userId);
    res.json(result);
  });

  export const getCategories = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const categories = await ModulesService.getCategories();
    res.json(categories);
  });

  export const getRecommended = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const recommendations = await ModulesService.getRecommended(slug);
    res.json(recommendations);
  });

  export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const mod = await ModulesService.create(req.body);
    res.status(201).json(mod);
  });

  export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const mod = await ModulesService.update(slug, req.body);
    res.json(mod);
  });

  export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    await ModulesService.remove(slug);
    res.json({ success: true });
  });
}
