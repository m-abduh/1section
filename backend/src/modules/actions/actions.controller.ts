import { Response, NextFunction } from "express";
import { ActionsService } from "./actions.service";
import type { AuthRequest } from "../../types";
import type { CreateActionInput, UpdateActionInput } from "./actions.schema";

export namespace ActionsController {
  export async function list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const plans = await ActionsService.list(req.user!.userId);
      res.json(plans);
    } catch (err) {
      next(err);
    }
  }

  export async function getByModule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const plan = await ActionsService.getByModule(req.user!.userId, slug);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }

  export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const plan = await ActionsService.getById(req.user!.userId, id);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }

  export async function create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateActionInput;
      const plan = await ActionsService.create(req.user!.userId, body);
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  }

  export async function update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = req.body as UpdateActionInput;
      const plan = await ActionsService.update(req.user!.userId, id, body);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }

  export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await ActionsService.remove(req.user!.userId, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
