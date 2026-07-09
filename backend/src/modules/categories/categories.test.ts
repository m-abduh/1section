import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import categoriesRoutes from "./categories.routes";

const { mockPrisma, mockCache } = vi.hoisted(() => ({
  mockPrisma: {
    category: {
      findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(),
    },
    module: { findMany: vi.fn(), findFirst: vi.fn(), createMany: vi.fn() },
    cronJob: { deleteMany: vi.fn() },
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
  app.use("/api/categories", categoriesRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeCategory(overrides: Record<string, any> = {}) {
  return {
    id: "cat-1",
    name: "Mindset",
    slug: "mindset",
    description: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { modules: 0 },
    modules: [],
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Categories API", () => {
  describe("POST /api/categories", () => {
    it("should create a new category", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(fakeCategory({ name: "Mindset", slug: "mindset" }));

      const res = await request(createApp()).post("/api/categories").send({ name: "Mindset", slug: "mindset" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Mindset");
      expect(mockPrisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: "Mindset" }) })
      );
    });

    it("should auto-generate slug from name", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(fakeCategory({ name: "Critical Thinking", slug: "critical-thinking" }));

      const res = await request(createApp()).post("/api/categories").send({ name: "Critical Thinking", slug: "critical-thinking" });

      expect(res.status).toBe(201);
      expect(res.body.slug).toBe("critical-thinking");
    });

    it("should reject duplicate name (case-insensitive)", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(fakeCategory({ name: "Mindset" }));

      const res = await request(createApp()).post("/api/categories").send({ name: "mindset", slug: "mindset" });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/already exists/i);
    });

    it("should reject empty name", async () => {
      const res = await request(createApp()).post("/api/categories").send({ name: "", slug: "" });

      expect(res.status).toBe(400);
    });

    it("should accept description and sortOrder", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(
        fakeCategory({ name: "Productivity", slug: "productivity", description: "Boost efficiency", sortOrder: 5 })
      );

      const res = await request(createApp())
        .post("/api/categories")
        .send({ name: "Productivity", slug: "productivity", description: "Boost efficiency", sortOrder: 5 });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe("Boost efficiency");
      expect(res.body.sortOrder).toBe(5);
    });

    it("should default sortOrder to 0", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(fakeCategory({ name: "Habit", sortOrder: 0 }));

      const res = await request(createApp()).post("/api/categories").send({ name: "Habit", slug: "habit" });

      expect(res.status).toBe(201);
      expect(res.body.sortOrder).toBe(0);
    });

    it("should reject duplicate slug", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(fakeCategory({ name: "Other", slug: "my-slug" }));

      const res = await request(createApp()).post("/api/categories").send({ name: "Other", slug: "my-slug" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/categories (listAll)", () => {
    it("should return all categories sorted by sortOrder", async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        fakeCategory({ name: "A", slug: "a", sortOrder: 1 }),
        fakeCategory({ name: "M", slug: "m", sortOrder: 5 }),
        fakeCategory({ name: "Z", slug: "z", sortOrder: 10 }),
      ]);

      const res = await request(createApp()).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].slug).toBe("a");
    });

    it("should include module counts", async () => {
      mockPrisma.category.findMany.mockResolvedValue([{ ...fakeCategory(), _count: { modules: 5 } }]);

      const res = await request(createApp()).get("/api/categories");

      expect(res.body[0]._count.modules).toBe(5);
    });

    it("should return empty array when no categories", async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/categories/admin/list", () => {
    it("should paginate and search", async () => {
      mockPrisma.category.findMany.mockResolvedValue([fakeCategory({ name: "Mindset" })]);
      mockPrisma.category.count.mockResolvedValue(1);

      const res = await request(createApp()).get("/api/categories/admin/list?page=1&limit=10&search=mind");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe("GET /api/categories/:id", () => {
    it("should return category by id", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(fakeCategory());

      const res = await request(createApp()).get("/api/categories/cat-1");

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Mindset");
    });

    it("should return 404 for non-existent id", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).get("/api/categories/nonexistent");

      expect(res.status).toBe(404);
    });

    it("should include associated modules", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(
        fakeCategory({ modules: [{ id: "m1", title: "Test Module", slug: "test-m" }] })
      );

      const res = await request(createApp()).get("/api/categories/cat-1");

      expect(res.body.modules).toHaveLength(1);
      expect(res.body.modules[0].title).toBe("Test Module");
    });
  });

  describe("GET /api/categories/slug/:slug", () => {
    it("should return category by slug", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(fakeCategory({ name: "Focus", slug: "focus" }));

      const res = await request(createApp()).get("/api/categories/slug/focus");

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Focus");
    });

    it("should return 404 for non-existent slug", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).get("/api/categories/slug/nonexistent");

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/categories/:id", () => {
    it("should rename category", async () => {
      // Service calls: findUnique (existing), findFirst (conflict check), update
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(fakeCategory()) // existing check
        .mockResolvedValueOnce(fakeCategory({ name: "Growth Mindset" })); // final update result
      mockPrisma.category.findFirst.mockResolvedValue(null); // no conflict
      mockPrisma.category.update.mockResolvedValue(fakeCategory({ name: "Growth Mindset" }));

      const res = await request(createApp()).patch("/api/categories/cat-1").send({ name: "Growth Mindset" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Growth Mindset");
    });

    it("should update description", async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(fakeCategory())
        .mockResolvedValueOnce(fakeCategory({ description: "Updated desc" }));
      mockPrisma.category.update.mockResolvedValue(fakeCategory({ description: "Updated desc" }));

      const res = await request(createApp()).patch("/api/categories/cat-1").send({ description: "Updated desc" });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe("Updated desc");
    });

    it("should update sortOrder", async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(fakeCategory({ sortOrder: 5 }))
        .mockResolvedValueOnce(fakeCategory({ sortOrder: 1 }));
      mockPrisma.category.update.mockResolvedValue(fakeCategory({ sortOrder: 1 }));

      const res = await request(createApp()).patch("/api/categories/cat-1").send({ sortOrder: 1 });

      expect(res.status).toBe(200);
      expect(res.body.sortOrder).toBe(1);
    });

    it("should reject rename to existing name", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(fakeCategory({ id: "cat-2", name: "Focus" }));
      mockPrisma.category.findFirst.mockResolvedValue(fakeCategory({ id: "cat-1", name: "Mindset" }));

      const res = await request(createApp()).patch("/api/categories/cat-2").send({ name: "Mindset" });

      expect(res.status).toBe(409);
    });

    it("should return 404 for non-existent", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.findFirst.mockResolvedValue(null);

      const res = await request(createApp()).patch("/api/categories/nonexistent").send({ name: "New" });

      expect(res.status).toBe(404);
    });

    it("should allow same name update (update other fields)", async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(fakeCategory({ name: "Mindset" }))
        .mockResolvedValueOnce(fakeCategory({ description: "Updated" }));
      mockPrisma.category.update.mockResolvedValue(fakeCategory({ description: "Updated" }));

      const res = await request(createApp()).patch("/api/categories/cat-1").send({ name: "Mindset", description: "Updated" });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe("Updated");
    });
  });

  describe("DELETE /api/categories/:id", () => {
    it("should delete category", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(fakeCategory());

      const res = await request(createApp()).delete("/api/categories/cat-1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
    });

    it("should return 404 for non-existent", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).delete("/api/categories/nonexistent");

      expect(res.status).toBe(404);
    });
  });
});