import { Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import type { AuthRequest } from "../../types";
import type {
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
  UpdateProfileInput,
  UpdatePreferencesInput,
} from "./auth.schema";

export namespace AuthController {
  export async function register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as RegisterInput;
      const result = await AuthService.register(body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as LoginInput;
      const result = await AuthService.login(body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function googleAuth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as GoogleAuthInput;
      const result = await AuthService.googleAuth(body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await AuthService.getProfile(req.user!.userId);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as UpdateProfileInput;
      const result = await AuthService.updateProfile(req.user!.userId, body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function getPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.getPreferences(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as UpdatePreferencesInput;
      const result = await AuthService.updatePreferences(req.user!.userId, body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await AuthService.listUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  }
}
