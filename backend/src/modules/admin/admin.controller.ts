import { Response, NextFunction } from "express";
import { getLsMode, setLsMode } from "../../config/ls-mode";
import { env } from "../../config/env";
import type { AuthRequest } from "../../types";

export namespace AdminController {
  export async function getLsModeConfig(_req: AuthRequest, res: Response) {
    const currentMode = await getLsMode();
    res.json({
      mode: currentMode,
      devKeyPresent: !!env.lemonSqueezy.devApiKey,
      prodKeyPresent: !!env.lemonSqueezy.prodApiKey,
    });
  }

  export async function setLsModeConfig(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { mode } = req.body;
      if (mode !== "dev" && mode !== "prod") {
        res.status(400).json({ error: "Mode must be 'dev' or 'prod'" });
        return;
      }
      await setLsMode(mode);
      res.json({ mode: await getLsMode() });
    } catch (err) {
      next(err);
    }
  }
}
