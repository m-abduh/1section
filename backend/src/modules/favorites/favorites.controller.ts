import { Response } from "express";
import { FavoritesService } from "./favorites.service";
import type { AuthRequest } from "../../types";
import type { AddFavoriteInput } from "./favorites.schema";
import { asyncHandler } from "../../lib/async-handler";

export namespace FavoritesController {
  export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const favorites = await FavoritesService.list(req.user!.userId);
    res.json(favorites);
  });

  export const add = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const favorite = await FavoritesService.add(req.user!.userId, slug);
    res.status(201).json(favorite);
  });

  export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const result = await FavoritesService.remove(req.user!.userId, slug);
    res.json(result);
  });

  export const check = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const isFavorited = await FavoritesService.check(req.user!.userId, slug);
    res.json({ isFavorited });
  });
}
