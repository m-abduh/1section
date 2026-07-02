import { Request, Response, NextFunction } from "express";
import { CategoriesService } from "./categories.service";
import type { AuthRequest } from "../../types";

export namespace CategoriesController {
  export async function list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = req.query;
      const result = await CategoriesService.list({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string | undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function listAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoriesService.listAll();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const category = await CategoriesService.getById(id);
      res.json(category);
    } catch (err) {
      next(err);
    }
  }

  export async function create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = await CategoriesService.create(req.body);
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  }

  export async function update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const category = await CategoriesService.update(id, req.body);
      res.json(category);
    } catch (err) {
      next(err);
    }
  }

  export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await CategoriesService.remove(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}
