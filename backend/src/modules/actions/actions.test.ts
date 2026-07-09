import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import actionsRoutes from "./actions.routes";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    actionPlan: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    module: { findUnique: vi.fn() },
    $disconnect: vi.fn(),
  },
}));

vi.mock("../../lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../../lib/cache", () => ({
  Cache: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn(), delByPattern: vi.fn(), key: vi.fn(), PREFIXES: {} },
}));
vi.mock("../../middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: "user-1", email: "user@test.com", role: "USER" };
    next();
  },
  authorize: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
  optionalAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: "user-1", email: "user@test.com", role: "USER" };
    next();
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/actions", actionsRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakePlan(overrides: Record<string, any> = {}) {
  return {
    id: "plan-1",
    userId: "user-1",
    moduleId: "mod-1",
    title: "My Action Plan",
    content: [{ id: 1, type: "text", label: "Step 1", value: "" }],
    completed: false,
    appliedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    module: { slug: "test-module", title: "Test Module", category: { name: "Mindset" } },
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Actions API", () => {
  describe("GET /api/actions", () => {
    it("should list user action plans", async () => {
      mockPrisma.actionPlan.findMany.mockResolvedValue([fakePlan()]);
      const res = await request(createApp()).get("/api/actions");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("My Action Plan");
    });

    it("should return empty list", async () => {
      mockPrisma.actionPlan.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/actions");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/actions/module/:slug", () => {
    it("should return plan for module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.actionPlan.findUnique.mockResolvedValue(fakePlan());
      const res = await request(createApp()).get("/api/actions/module/test-module");
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("My Action Plan");
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/actions/module/nonexistent");
      expect(res.status).toBe(404);
    });

    it("should return null when no plan exists", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.actionPlan.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/actions/module/test-module");
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe("GET /api/actions/:id", () => {
    it("should return plan by id", async () => {
      mockPrisma.actionPlan.findFirst.mockResolvedValue(fakePlan());
      const res = await request(createApp()).get("/api/actions/plan-1");
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("My Action Plan");
    });

    it("should return 404 for nonexistent id", async () => {
      mockPrisma.actionPlan.findFirst.mockResolvedValue(null);
      mockPrisma.actionPlan.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/actions/nonexistent");
      expect(res.status).toBe(404);
    });

    it("should return 403 for unowned plan", async () => {
      mockPrisma.actionPlan.findFirst.mockResolvedValue(null);
      mockPrisma.actionPlan.findUnique.mockResolvedValue({ id: "plan-2" });
      const res = await request(createApp()).get("/api/actions/plan-2");
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/actions", () => {
    it("should create action plan", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.actionPlan.findUnique.mockResolvedValue(null);
      mockPrisma.actionPlan.create.mockResolvedValue(fakePlan());
      const res = await request(createApp())
        .post("/api/actions")
        .send({ moduleSlug: "test-module", title: "My Action Plan", content: [{ id: 1, type: "text", label: "Step 1", value: "" }] });
      expect(res.status).toBe(201);
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp())
        .post("/api/actions")
        .send({ moduleSlug: "nonexistent", title: "Plan", content: [] });
      expect(res.status).toBe(404);
    });

    it("should reject duplicate plan", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.actionPlan.findUnique.mockResolvedValue(fakePlan());
      const res = await request(createApp())
        .post("/api/actions")
        .send({ moduleSlug: "test-module", title: "Duplicate", content: [] });
      expect(res.status).toBe(500);
    });

    it("should validate input", async () => {
      const res = await request(createApp()).post("/api/actions").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/actions/:id", () => {
    it("should update action plan", async () => {
      mockPrisma.actionPlan.findFirst.mockResolvedValue(fakePlan());
      mockPrisma.actionPlan.update.mockResolvedValue(fakePlan({ title: "Updated" }));
      const res = await request(createApp()).patch("/api/actions/plan-1").send({ title: "Updated" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated");
    });

    it("should return 404 for nonexistent", async () => {
      mockPrisma.actionPlan.findFirst.mockResolvedValue(null);
      mockPrisma.actionPlan.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).patch("/api/actions/nonexistent").send({ title: "Updated" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/actions/:id", () => {
    it("should delete action plan", async () => {
      mockPrisma.actionPlan.findFirst.mockResolvedValue(fakePlan());
      mockPrisma.actionPlan.delete.mockResolvedValue(fakePlan());
      const res = await request(createApp()).delete("/api/actions/plan-1");
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for nonexistent", async () => {
      mockPrisma.actionPlan.findFirst.mockResolvedValue(null);
      mockPrisma.actionPlan.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).delete("/api/actions/nonexistent");
      expect(res.status).toBe(404);
    });
  });
});
