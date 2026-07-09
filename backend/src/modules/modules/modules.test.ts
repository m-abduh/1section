import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import modulesRoutes from "./modules.routes";

const { mockPrisma, mockCache } = vi.hoisted(() => ({
  mockPrisma: {
    category: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    module: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
    moduleNode: { deleteMany: vi.fn(), createMany: vi.fn() },
    moduleEdge: { deleteMany: vi.fn(), createMany: vi.fn() },
    question: { deleteMany: vi.fn(), createMany: vi.fn() },
    userProgress: { findMany: vi.fn() },
    favorite: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn((cb: any) => cb(mockPrisma)),
    $disconnect: vi.fn(),
  },
  mockCache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    delByPattern: vi.fn().mockResolvedValue(undefined),
    key: vi.fn().mockImplementation((prefix: string) => prefix),
    PREFIXES: {
      CATEGORIES_LIST: "cache:categories:list",
      MODULES_LIST: "cache:modules:list",
      MODULES_CATEGORIES: "cache:modules:categories",
      DAILY_FREE: "cache:modules:daily-free",
      DAILY_FREE_SLUG: "cache:modules:daily-free-slug",
    },
  },
}));

vi.mock("../../lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../../lib/cache", () => ({ Cache: mockCache }));
vi.mock("../../middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: "test-admin", email: "admin@test.com", role: "ADMIN" };
    next();
  },
  authorize: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
  optionalAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: "test-admin", email: "admin@test.com", role: "ADMIN" };
    next();
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/modules", modulesRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeModule(overrides: Record<string, any> = {}) {
  return {
    id: "mod-1",
    slug: "test-module",
    title: "Test Module",
    description: "Test description",
    category: { name: "Mindset" },
    categoryId: "cat-1",
    isPremium: false,
    isDraft: false,
    wordCount: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
    nodes: [{ id: "n1", positionX: 0, positionY: 0, label: "Node", slug: "node", type: "custom", style: null }],
    edges: [] as any[],
    questions: [],
    favorites: [],
    _count: { questions: 2 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Modules API with Categories", () => {
  describe("GET /api/modules", () => {
    it("should return modules with category name resolved", async () => {
      // getDailyFreeSlug calls: count (0 -> null) then cache set (skipped)
      mockPrisma.module.count.mockResolvedValueOnce(0);
      // List query
      mockPrisma.module.count.mockResolvedValueOnce(1);
      mockPrisma.module.findMany.mockResolvedValue([fakeModule()]);

      const res = await request(createApp()).get("/api/modules");

      expect(res.status).toBe(200);
      expect(res.body.data[0].category).toBe("Mindset");
    });

    it("should filter by category name (resolve to categoryId)", async () => {
      mockPrisma.module.count.mockResolvedValueOnce(0); // daily free
      mockPrisma.category.findFirst.mockResolvedValue({ id: "cat-1" });
      mockPrisma.module.count.mockResolvedValueOnce(1);
      mockPrisma.module.findMany.mockResolvedValue([fakeModule()]);

      const res = await request(createApp()).get("/api/modules?category=Mindset");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(mockPrisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoryId: "cat-1" }) })
      );
    });

    it("should return empty list when no modules match", async () => {
      mockPrisma.module.count.mockResolvedValueOnce(0); // daily free
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.module.count.mockResolvedValueOnce(0);
      mockPrisma.module.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/modules?category=Nonexistent");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("should handle multiple category filter", async () => {
      mockPrisma.module.count.mockResolvedValueOnce(0); // daily free
      mockPrisma.category.findMany.mockResolvedValue([{ id: "cat-1" }, { id: "cat-2" }]);
      mockPrisma.module.count.mockResolvedValueOnce(2);
      mockPrisma.module.findMany.mockResolvedValue([
        fakeModule({ slug: "m1", category: { name: "Mindset" } }),
        fakeModule({ slug: "m2", category: { name: "Focus" } }),
      ]);
      const res = await request(createApp()).get("/api/modules?categories=Mindset,Focus");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe("GET /api/modules/categories", () => {
    it("should return categories with module counts", async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        { name: "Mindset", _count: { modules: 2 } },
        { name: "Focus", _count: { modules: 1 } },
      ]);
      const res = await request(createApp()).get("/api/modules/categories");
      expect(res.status).toBe(200);
      expect(res.body.find((c: any) => c.name === "Mindset").count).toBe(2);
    });

    it("should return empty when no categories", async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/modules/categories");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/modules/:slug", () => {
    it("should return module with resolved category", async () => {
      mockPrisma.module.count.mockResolvedValueOnce(0); // getDailyFreeSlug inside getBySlug
      mockPrisma.module.findUnique
        .mockResolvedValueOnce(fakeModule()) // first call (check exists)
        .mockResolvedValueOnce(fakeModule({ questions: [{ id: "q1" }] })); // second call (full module)
      mockPrisma.userProgress.findMany.mockResolvedValue([]);
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/modules/test-module");
      expect(res.status).toBe(200);
      expect(res.body.category).toBe("Mindset");
    });

    it("should return 404 for non-existent slug", async () => {
      mockPrisma.module.count.mockResolvedValueOnce(0); // getDailyFreeSlug
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/modules/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/modules/:slug/recommended", () => {
    it("should recommend from same category", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(fakeModule({ category: { id: "cat-1" } }));
      mockPrisma.module.findMany.mockResolvedValue([
        fakeModule({ slug: "rec1", title: "Rec 1", category: { name: "Mindset" } }),
      ]);
      const res = await request(createApp()).get("/api/modules/test-module/recommended");
      expect(res.status).toBe(200);
      expect(res.body[0].category).toBe("Mindset");
    });

    it("should return empty when no others", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(fakeModule({ category: { id: "cat-1" } }));
      mockPrisma.module.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/modules/test-module/recommended");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("POST /api/modules", () => {
    it("should create with category resolved from string", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      mockPrisma.category.findFirst.mockResolvedValue({ id: "cat-1" });
      mockPrisma.module.create.mockResolvedValue(fakeModule());

      const res = await request(createApp())
        .post("/api/modules")
        .send({ slug: "new-module", title: "New Module", description: "Desc", category: "Mindset", isDraft: false, isPremium: false });

      expect(res.status).toBe(201);
    });

    it("should reject module with no category", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp())
        .post("/api/modules")
        .send({ slug: "no-cat", title: "No Cat", description: "Desc", isDraft: false, isPremium: false });
      expect(res.status).toBe(400);
    });
  });
});