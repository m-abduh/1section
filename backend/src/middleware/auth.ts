import { Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { UnauthorizedError } from "../lib/errors";
import type { AuthRequest } from "../types";

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = header.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, email: payload.email };
  } catch {
    // silently ignore invalid tokens for optional auth
  }
  next();
}
