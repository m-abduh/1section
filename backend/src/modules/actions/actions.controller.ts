import { Response } from "express";
import { ActionsService } from "./actions.service";
import type { AuthRequest } from "../../types";
import type { CreateActionInput, UpdateActionInput } from "./actions.schema";
import { asyncHandler } from "../../lib/async-handler";

export namespace ActionsController {
  export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const plans = await ActionsService.list(req.user!.userId);
    res.json(plans);
  });

  export const getByModule = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const plan = await ActionsService.getByModule(req.user!.userId, slug);
    res.json(plan);
  });

  export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const plan = await ActionsService.getById(req.user!.userId, id);
    res.json(plan);
  });

  export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as CreateActionInput;
    const plan = await ActionsService.create(req.user!.userId, body);
    res.status(201).json(plan);
  });

  export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const body = req.body as UpdateActionInput;
    const plan = await ActionsService.update(req.user!.userId, id, body);
    res.json(plan);
  });

  export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const result = await ActionsService.remove(req.user!.userId, id);
    res.json(result);
  });
}
