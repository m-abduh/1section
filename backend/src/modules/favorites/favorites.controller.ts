import { Response, NextFunction } from "express";
import { FavoritesService } from "./favorites.service";
import type { AuthRequest } from "../../types";
import type { AddFavoriteInput } from "./favorites.schema";

export namespace FavoritesController {
  export async function list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const favorites = await FavoritesService.list(req.user!.userId);
      res.json(favorites);
    } catch (err) {
      next(err);
    }
  }

  export async function add(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const favorite = await FavoritesService.add(req.user!.userId, slug);
      res.status(201).json(favorite);
    } catch (err) {
      next(err);
    }
  }

  export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const result = await FavoritesService.remove(req.user!.userId, slug);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function check(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const isFavorited = await FavoritesService.check(req.user!.userId, slug);
      res.json({ isFavorited });
    } catch (err) {
      next(err);
    }
  }
}
