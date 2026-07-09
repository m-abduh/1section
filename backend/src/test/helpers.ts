import express from "express";
import { Router } from "express";
import { errorHandler } from "../middleware/error-handler";

export function createAuthMiddleware(role: string | null) {
  return (req: any, _res: any, next: any) => {
    if (role) {
      req.user = { userId: "test-admin-id", email: "admin@test.com", role };
    } else {
      req.user = undefined;
    }
    next();
  };
}

export function createTestApp(routes: (router: Router) => void): express.Application {
  const app = express();
  app.use(express.json());

  const router = Router();
  routes(router);
  app.use("/api", router);

  app.use((_req, res) => {
    res.status(404).json({ error: { message: "Route not found", statusCode: 404 } });
  });

  app.use(errorHandler);

  return app;
}