import { Request, Response, NextFunction } from "express";
import { ModulesService } from "./modules.service";
import type { AuthRequest } from "../../types";

export namespace ModulesController {
  export async function list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, category, categories, search, admin, preferred } = req.query;

      const result = await ModulesService.list({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        category: category as string | undefined,
        categories: categories as string | undefined,
        search: search as string | undefined,
        userId: req.user?.userId,
        admin: admin === "true",
        preferred: preferred === "true",
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function getBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const admin = req.query.admin === "true";
      const mod = await ModulesService.getBySlug(slug, req.user?.userId, admin);
      res.json(mod);
    } catch (err) {
      next(err);
    }
  }

  export async function getDailyFree(_req: Request, res: Response, next: NextFunction) {
    try {
      const mod = await ModulesService.getDailyFree();
      res.json(mod);
    } catch (err) {
      next(err);
    }
  }

  export async function checkAccess(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const result = await ModulesService.checkAccess(slug, req.user?.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await ModulesService.getCategories();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  export async function getRecommended(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const recommendations = await ModulesService.getRecommended(slug);
      res.json(recommendations);
    } catch (err) {
      next(err);
    }
  }

  export async function create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mod = await ModulesService.create(req.body);
      res.status(201).json(mod);
    } catch (err) {
      next(err);
    }
  }

  export async function update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const mod = await ModulesService.update(slug, req.body);
      res.json(mod);
    } catch (err) {
      next(err);
    }
  }

  export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      await ModulesService.remove(slug);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}
