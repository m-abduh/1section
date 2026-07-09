import { Response } from "express";
import { AuthService } from "./auth.service";
import type { AuthRequest } from "../../types";
import type {
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
  UpdateProfileInput,
  UpdatePreferencesInput,
} from "./auth.schema";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/async-handler";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
};

function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, COOKIE_OPTIONS);
}

function clearAuthCookie(res: Response) {
  res.clearCookie("token", { path: "/", ...(env.cookie.domain ? { domain: env.cookie.domain } : {}) });
}

export namespace AuthController {
  export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as RegisterInput;
    const result = await AuthService.register(body);
    setAuthCookie(res, result.token);
    res.status(201).json(result);
  });

  export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as LoginInput;
    const result = await AuthService.login(body);
    setAuthCookie(res, result.token);
    res.json(result);
  });

  export const googleAuth = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as GoogleAuthInput;
    const result = await AuthService.googleAuth(body);
    setAuthCookie(res, result.token);
    res.json(result);
  });

  export const logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await AuthService.getProfile(req.user!.userId);
    res.json(profile);
  });

  export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as UpdateProfileInput;
    const result = await AuthService.updateProfile(req.user!.userId, body);
    res.json(result);
  });

  export const getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.getPreferences(req.user!.userId);
    res.json(result);
  });

  export const updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as UpdatePreferencesInput;
    const result = await AuthService.updatePreferences(req.user!.userId, body);
    res.json(result);
  });

  export const listUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await AuthService.listUsers();
    res.json(users);
  });
}
