import { Response } from "express";
import { ReviewsService } from "./reviews.service";
import type { AuthRequest } from "../../types";
import type { CreateReviewInput } from "./reviews.schema";
import { asyncHandler } from "../../lib/async-handler";

export namespace ReviewsController {
  export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user?.role === "ADMIN";
    const all = req.query.all === "true" && isAdmin;
    const reviews = await ReviewsService.list(req.user!.userId, all);
    res.json(reviews);
  });

  export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as CreateReviewInput;
    const review = await ReviewsService.create(req.user!.userId, body);
    res.status(201).json(review);
  });
}
