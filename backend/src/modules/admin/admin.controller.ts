import { Response } from "express";
import { z } from "zod";
import { getLsMode, setLsMode } from "../../config/ls-mode";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import type { AuthRequest } from "../../types";
import { asyncHandler } from "../../lib/async-handler";

const setLsModeSchema = z.object({
  mode: z.enum(["dev", "prod"]),
});

export namespace AdminController {
  export const getLsModeConfig = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const currentMode = await getLsMode();
    res.json({
      mode: currentMode,
      devKeyPresent: !!env.lemonSqueezy.devApiKey,
      prodKeyPresent: !!env.lemonSqueezy.prodApiKey,
    });
  });

  export const setLsModeConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { mode } = setLsModeSchema.parse(req.body);
    await setLsMode(mode);
    res.json({ mode: await getLsMode() });
  });
}
