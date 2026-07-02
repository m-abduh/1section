import { Response, NextFunction } from "express";
import { getLsMode, setLsMode } from "../../config/ls-mode";
import { env } from "../../config/env";
import type { AuthRequest } from "../../types";

export namespace AdminController {
  export function getLsModeConfig(_req: AuthRequest, res: Response) {
    const currentMode = getLsMode();
    res.json({
      mode: currentMode,
      devKeyPresent: !!env.lemonSqueezy.devApiKey,
      prodKeyPresent: !!env.lemonSqueezy.prodApiKey,
    });
  }

  export function setLsModeConfig(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { mode } = req.body;
      if (mode !== "dev" && mode !== "prod") {
        res.status(400).json({ error: "Mode must be 'dev' or 'prod'" });
        return;
      }
      setLsMode(mode);
      res.json({ mode: getLsMode() });
    } catch (err) {
      next(err);
    }
  }
}
