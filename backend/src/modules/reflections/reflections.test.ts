import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import reflectionsRoutes from "./reflections.routes";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    reflection: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
  app.use("/api/reflections", reflectionsRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeReflection(overrides: Record<string, any> = {}) {
  return {
    id: "ref-1",
    userId: "user-1",
    moduleId: "mod-1",
    title: "My Reflection",
    content: "I learned a lot...",
    timestamp: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    module: { slug: "test-module", title: "Test Module", category: { name: "Mindset" } },
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Reflections API", () => {
  describe("GET /api/reflections", () => {
    it("should list user reflections", async () => {
      mockPrisma.reflection.findMany.mockResolvedValue([fakeReflection()]);
      const res = await request(createApp()).get("/api/reflections");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("My Reflection");
    });

    it("should return empty list", async () => {
      mockPrisma.reflection.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/reflections");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/reflections/:id", () => {
    it("should return reflection by id", async () => {
      mockPrisma.reflection.findFirst.mockResolvedValue(fakeReflection());
      const res = await request(createApp()).get("/api/reflections/ref-1");
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("My Reflection");
    });

    it("should return 404 for nonexistent", async () => {
      mockPrisma.reflection.findFirst.mockResolvedValue(null);
      mockPrisma.reflection.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/reflections/nonexistent");
      expect(res.status).toBe(404);
    });

    it("should return 403 for unowned reflection", async () => {
      mockPrisma.reflection.findFirst.mockResolvedValue(null);
      mockPrisma.reflection.findUnique.mockResolvedValue({ id: "ref-2" });
      const res = await request(createApp()).get("/api/reflections/ref-2");
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/reflections", () => {
    it("should create reflection", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.reflection.create.mockResolvedValue(fakeReflection());
      const res = await request(createApp())
        .post("/api/reflections")
        .send({ moduleSlug: "test-module", title: "My Reflection", content: "I learned a lot..." });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe("My Reflection");
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp())
        .post("/api/reflections")
        .send({ moduleSlug: "nonexistent", title: "Reflection", content: "Content" });
      expect(res.status).toBe(404);
    });

    it("should validate input", async () => {
      const res = await request(createApp()).post("/api/reflections").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/reflections/:id", () => {
    it("should update reflection", async () => {
      mockPrisma.reflection.findFirst.mockResolvedValue(fakeReflection());
      mockPrisma.reflection.update.mockResolvedValue(fakeReflection({ title: "Updated" }));
      const res = await request(createApp()).put("/api/reflections/ref-1").send({ title: "Updated" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated");
    });

    it("should return 404 for nonexistent", async () => {
      mockPrisma.reflection.findFirst.mockResolvedValue(null);
      mockPrisma.reflection.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).put("/api/reflections/nonexistent").send({ title: "Updated" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/reflections/:id", () => {
    it("should delete reflection", async () => {
      mockPrisma.reflection.findFirst.mockResolvedValue(fakeReflection());
      mockPrisma.reflection.delete.mockResolvedValue(fakeReflection());
      const res = await request(createApp()).delete("/api/reflections/ref-1");
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for nonexistent", async () => {
      mockPrisma.reflection.findFirst.mockResolvedValue(null);
      mockPrisma.reflection.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).delete("/api/reflections/nonexistent");
      expect(res.status).toBe(404);
    });
  });
});
