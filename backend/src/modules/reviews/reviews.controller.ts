import { Response, NextFunction } from "express";
import { ReviewsService } from "./reviews.service";
import type { AuthRequest } from "../../types";
import type { CreateReviewInput } from "./reviews.schema";

export namespace ReviewsController {
  export async function list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user?.role === "ADMIN";
      const all = req.query.all === "true" && isAdmin;
      const reviews = await ReviewsService.list(req.user!.userId, all);
      res.json(reviews);
    } catch (err) {
      next(err);
    }
  }

  export async function create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateReviewInput;
      const review = await ReviewsService.create(req.user!.userId, body);
      res.status(201).json(review);
    } catch (err) {
      next(err);
    }
  }
}
