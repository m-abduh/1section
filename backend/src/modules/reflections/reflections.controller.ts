import { Response } from "express";
import { ReflectionsService } from "./reflections.service";
import type { AuthRequest } from "../../types";
import type { CreateReflectionInput, UpdateReflectionInput } from "./reflections.schema";
import { asyncHandler } from "../../lib/async-handler";

export namespace ReflectionsController {
  export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reflections = await ReflectionsService.list(req.user!.userId);
    res.json(reflections);
  });

  export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const reflection = await ReflectionsService.getById(req.user!.userId, id);
    res.json(reflection);
  });

  export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as CreateReflectionInput;
    const reflection = await ReflectionsService.create(req.user!.userId, body);
    res.status(201).json(reflection);
  });

  export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const body = req.body as UpdateReflectionInput;
    const reflection = await ReflectionsService.update(req.user!.userId, id, body);
    res.json(reflection);
  });

  export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const result = await ReflectionsService.remove(req.user!.userId, id);
    res.json(result);
  });
}
