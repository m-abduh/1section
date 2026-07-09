import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import favoritesRoutes from "./favorites.routes";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    favorite: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
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
  app.use("/api/favorites", favoritesRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeModule(overrides: Record<string, any> = {}) {
  return {
    id: "mod-1",
    slug: "test-module",
    title: "Test Module",
    description: "Test desc",
    category: { name: "Mindset" },
    isPremium: false,
    nodes: [{ id: "n1", positionX: 0, positionY: 0, label: "N1", slug: null, type: null, style: null }],
    edges: [{ id: "e1", source: "n1", target: "n2", label: null, animated: true }],
    _count: { questions: 2 },
    ...overrides,
  };
}

function fakeFavorite(overrides: Record<string, any> = {}) {
  return {
    id: "fav-1",
    userId: "user-1",
    moduleId: "mod-1",
    createdAt: new Date(),
    module: fakeModule(),
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Favorites API", () => {
  describe("GET /api/favorites", () => {
    it("should list user favorites", async () => {
      mockPrisma.favorite.findMany.mockResolvedValue([fakeFavorite()]);
      const res = await request(createApp()).get("/api/favorites");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].moduleId).toBe("mod-1");
      expect(res.body[0].slug).toBe("test-module");
    });

    it("should return empty list", async () => {
      mockPrisma.favorite.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/favorites");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("POST /api/favorites/:slug", () => {
    it("should add favorite", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.favorite.create.mockResolvedValue(fakeFavorite());
      const res = await request(createApp()).post("/api/favorites/test-module");
      expect(res.status).toBe(201);
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).post("/api/favorites/nonexistent");
      expect(res.status).toBe(404);
    });

    it("should reject duplicate favorite", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.favorite.findUnique.mockResolvedValue(fakeFavorite());
      const res = await request(createApp()).post("/api/favorites/test-module");
      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /api/favorites/:slug", () => {
    it("should remove favorite", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.favorite.findUnique.mockResolvedValue(fakeFavorite());
      mockPrisma.favorite.delete.mockResolvedValue(fakeFavorite());
      const res = await request(createApp()).delete("/api/favorites/test-module");
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).delete("/api/favorites/nonexistent");
      expect(res.status).toBe(404);
    });

    it("should return 404 when not favorited", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).delete("/api/favorites/test-module");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/favorites/:slug/check", () => {
    it("should return true when favorited", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.favorite.findUnique.mockResolvedValue(fakeFavorite());
      const res = await request(createApp()).get("/api/favorites/test-module/check");
      expect(res.status).toBe(200);
      expect(res.body.isFavorited).toBe(true);
    });

    it("should return false when not favorited", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/favorites/test-module/check");
      expect(res.status).toBe(200);
      expect(res.body.isFavorited).toBe(false);
    });

    it("should return false for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/favorites/nonexistent/check");
      expect(res.status).toBe(200);
      expect(res.body.isFavorited).toBe(false);
    });
  });
});
