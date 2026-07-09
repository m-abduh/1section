import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import adminRoutes from "./admin.routes";

vi.mock("../../config/ls-mode", () => ({
  getLsMode: vi.fn().mockResolvedValue("dev"),
  setLsMode: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/redis", () => ({ getRedis: vi.fn().mockReturnValue(null) }));

vi.mock("../../middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: "admin-1", email: "admin@test.com", role: "ADMIN" };
    next();
  },
  authorize: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
  optionalAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: "admin-1", email: "admin@test.com", role: "ADMIN" };
    next();
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

describe("Admin API", () => {
  describe("GET /api/admin/ls-mode", () => {
    it("should return current ls mode", async () => {
      const res = await request(createApp()).get("/api/admin/ls-mode");
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe("dev");
      expect(res.body).toHaveProperty("devKeyPresent");
      expect(res.body).toHaveProperty("prodKeyPresent");
    });
  });

  describe("POST /api/admin/ls-mode", () => {
    it("should set ls mode", async () => {
      const res = await request(createApp())
        .post("/api/admin/ls-mode")
        .send({ mode: "prod" });
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe("dev");
    });

    it("should reject invalid mode", async () => {
      const res = await request(createApp())
        .post("/api/admin/ls-mode")
        .send({ mode: "invalid" });
      expect(res.status).toBe(400);
    });
  });
});
