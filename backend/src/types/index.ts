import { Request } from "express";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface AuthRequestWithRawBody extends AuthRequest {
  rawBody?: string;
}
