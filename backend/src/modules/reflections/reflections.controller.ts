import { Response, NextFunction } from "express";
import { ReflectionsService } from "./reflections.service";
import type { AuthRequest } from "../../types";
import type { CreateReflectionInput, UpdateReflectionInput } from "./reflections.schema";

export namespace ReflectionsController {
  export async function list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const reflections = await ReflectionsService.list(req.user!.userId);
      res.json(reflections);
    } catch (err) {
      next(err);
    }
  }

  export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const reflection = await ReflectionsService.getById(req.user!.userId, id);
      res.json(reflection);
    } catch (err) {
      next(err);
    }
  }

  export async function create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateReflectionInput;
      const reflection = await ReflectionsService.create(req.user!.userId, body);
      res.status(201).json(reflection);
    } catch (err) {
      next(err);
    }
  }

  export async function update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = req.body as UpdateReflectionInput;
      const reflection = await ReflectionsService.update(req.user!.userId, id, body);
      res.json(reflection);
    } catch (err) {
      next(err);
    }
  }

  export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await ReflectionsService.remove(req.user!.userId, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
