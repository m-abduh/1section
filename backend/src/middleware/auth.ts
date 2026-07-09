import { Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { UnauthorizedError, ForbiddenError } from "../lib/errors";
import type { AuthRequest } from "../types";

function extractToken(req: AuthRequest): string | null {
  const fromCookie = req.cookies?.token;
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }

  return null;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      next(new UnauthorizedError("Missing or invalid authorization"));
      return;
    }

    const payload = verifyToken(token);
    req.user = { userId: payload.userId, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, email: payload.email, role: payload.role };
  } catch {
    // silently ignore invalid tokens for optional auth
  }
  next();
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !roles.includes(req.user.role)) {
        next(new ForbiddenError("Insufficient permissions"));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
