import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import progressRoutes from "./progress.routes";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    userProgress: { findMany: vi.fn(), groupBy: vi.fn(), upsert: vi.fn() },
    category: { findMany: vi.fn() },
    module: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    moduleNode: { count: vi.fn() },
    reflection: { findMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    notebookEntry: { count: vi.fn() },
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
  app.use("/api/progress", progressRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeModule(overrides: Record<string, any> = {}) {
  return {
    id: "mod-1",
    slug: "test-module",
    title: "Test Module",
    description: "A test module",
    category: "Mindset",
    isPremium: false,
    isDraft: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    nodes: [{ content: JSON.stringify(["word1", "word2", "word3"]) }],
    _count: { nodes: 3 },
    ...overrides,
  };
}

function fakeProgress(overrides: Record<string, any> = {}) {
  return {
    userId: "user-1",
    moduleId: "mod-1",
    nodeId: "default",
    listeningProgress: 50,
    readingProgress: 75,
    scrollPosition: 100,
    currentCharIndex: 50,
    audioRate: 1,
    completed: false,
    lastReadAt: new Date(),
    module: fakeModule(),
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Progress API", () => {
  describe("GET /api/progress", () => {
    it("should return all progress", async () => {
      mockPrisma.userProgress.findMany.mockResolvedValue([fakeProgress()]);
      const res = await request(createApp()).get("/api/progress");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].slug).toBe("test-module");
    });

    it("should return empty list", async () => {
      mockPrisma.userProgress.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/progress");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/progress/continue-learning", () => {
    it("should return continue learning modules", async () => {
      mockPrisma.userProgress.groupBy.mockResolvedValue([
        { moduleId: "mod-1", _max: { lastReadAt: new Date() } },
      ]);
      mockPrisma.userProgress.findMany.mockResolvedValue([fakeProgress()]);
      const res = await request(createApp()).get("/api/progress/continue-learning");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].slug).toBe("test-module");
    });

    it("should return empty when no recent modules", async () => {
      mockPrisma.userProgress.groupBy.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/progress/continue-learning");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/progress/stats", () => {
    it("should return stats", async () => {
      mockPrisma.userProgress.findMany.mockResolvedValue([fakeProgress()]);
      mockPrisma.module.count.mockResolvedValue(10);
      mockPrisma.reflection.findMany.mockResolvedValue([
        { timestamp: new Date("2024-06-15") },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        streakCount: 5,
        preferredCategories: ["Mindset"],
      });
      mockPrisma.notebookEntry.count.mockResolvedValue(3);
      mockPrisma.category.findMany.mockResolvedValue([{ id: "cat-1", name: "Mindset" }]);
      mockPrisma.module.findMany.mockResolvedValue([
        { slug: "test-module", title: "Test Module", categoryId: "cat-1", createdAt: new Date() },
      ]);
      const res = await request(createApp()).get("/api/progress/stats");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalModules");
      expect(res.body).toHaveProperty("totalXp");
      expect(res.body).toHaveProperty("rank");
    });

    it("should handle preferred categories", async () => {
      mockPrisma.userProgress.findMany.mockResolvedValue([]);
      mockPrisma.module.count.mockResolvedValue(5);
      mockPrisma.reflection.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({
        streakCount: 0,
        preferredCategories: ["Mindset", "Focus"],
      });
      mockPrisma.notebookEntry.count.mockResolvedValue(0);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: "cat-1", name: "Focus" },
        { id: "cat-2", name: "Productivity" },
      ]);
      mockPrisma.module.findMany.mockResolvedValue([
        { slug: "m1", title: "M1", categoryId: "cat-1", createdAt: new Date() },
        { slug: "m2", title: "M2", categoryId: "cat-2", createdAt: new Date() },
      ]);
      const res = await request(createApp()).get("/api/progress/stats");
      expect(res.status).toBe(200);
      expect(res.body.overallProgress).toBe(0);
    });
  });

  describe("GET /api/progress/streak", () => {
    it("should return streak for active user", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      mockPrisma.user.findUnique.mockResolvedValue({
        streakCount: 5,
        lastActiveDate: today,
      });
      const res = await request(createApp()).get("/api/progress/streak");
      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(5);
      expect(res.body.showPopup).toBe(false);
    });

    it("should start streak for new user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        streakCount: 0,
        lastActiveDate: null,
      });
      mockPrisma.user.update.mockResolvedValue({});
      const res = await request(createApp()).get("/api/progress/streak");
      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(1);
    });

    it("should increment streak for consecutive day", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      mockPrisma.user.findUnique.mockResolvedValue({
        streakCount: 5,
        lastActiveDate: yesterday,
      });
      mockPrisma.user.update.mockResolvedValue({});
      const res = await request(createApp()).get("/api/progress/streak");
      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(6);
    });

    it("should reset streak after gap", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);
      mockPrisma.user.findUnique.mockResolvedValue({
        streakCount: 2,
        lastActiveDate: threeDaysAgo,
      });
      mockPrisma.user.update.mockResolvedValue({});
      const res = await request(createApp()).get("/api/progress/streak");
      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(1);
    });

    it("should show popup after losing 3+ streak", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);
      mockPrisma.user.findUnique.mockResolvedValue({
        streakCount: 3,
        lastActiveDate: threeDaysAgo,
      });
      const res = await request(createApp()).get("/api/progress/streak");
      expect(res.status).toBe(200);
      expect(res.body.showPopup).toBe(true);
    });
  });

  describe("POST /api/progress/streak/reset", () => {
    it("should reset streak", async () => {
      mockPrisma.user.update.mockResolvedValue({});
      const res = await request(createApp()).post("/api/progress/streak/reset");
      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(0);
    });
  });

  describe("GET /api/progress/:slug", () => {
    it("should return progress by slug", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.userProgress.findMany.mockResolvedValue([fakeProgress({ completed: true })]);
      mockPrisma.moduleNode.count.mockResolvedValue(1);
      const res = await request(createApp()).get("/api/progress/test-module");
      expect(res.status).toBe(200);
      expect(res.body.readingProgress).toBe(75);
    });

    it("should return null for no progress", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.userProgress.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/progress/test-module");
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/progress/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/progress/:slug", () => {
    it("should upsert progress", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.userProgress.upsert.mockResolvedValue(fakeProgress());
      const res = await request(createApp())
        .put("/api/progress/test-module")
        .send({ readingProgress: 80, completed: false });
      expect(res.status).toBe(200);
      expect(res.body.readingProgress).toBe(75);
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp())
        .put("/api/progress/nonexistent")
        .send({ readingProgress: 50 });
      expect(res.status).toBe(404);
    });

    it("should validate input", async () => {
      const res = await request(createApp())
        .put("/api/progress/test-module")
        .send({ readingProgress: 200 });
      expect(res.status).toBe(400);
    });
  });
});
