import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import reviewsRoutes from "./reviews.routes";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    review: { findMany: vi.fn(), create: vi.fn() },
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
  app.use("/api/reviews", reviewsRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeReview(overrides: Record<string, any> = {}) {
  return {
    id: "rev-1",
    userId: "user-1",
    moduleId: "mod-1",
    rating: 5,
    comment: "Great module!",
    createdAt: new Date(),
    module: { slug: "test-module", title: "Test Module" },
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Reviews API", () => {
  describe("GET /api/reviews", () => {
    it("should list user reviews", async () => {
      mockPrisma.review.findMany.mockResolvedValue([fakeReview()]);
      const res = await request(createApp()).get("/api/reviews");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBe(5);
    });

    it("should return empty list", async () => {
      mockPrisma.review.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/reviews");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("POST /api/reviews", () => {
    it("should create review", async () => {
      mockPrisma.review.create.mockResolvedValue(fakeReview());
      const res = await request(createApp())
        .post("/api/reviews")
        .send({ moduleSlug: "test-module", rating: 5, comment: "Great!" });
      expect(res.status).toBe(201);
    });

    it("should create review without module", async () => {
      mockPrisma.review.create.mockResolvedValue(fakeReview({ moduleSlug: undefined }));
      const res = await request(createApp())
        .post("/api/reviews")
        .send({ rating: 4 });
      expect(res.status).toBe(201);
    });

    it("should validate rating range", async () => {
      const res = await request(createApp())
        .post("/api/reviews")
        .send({ rating: 6 });
      expect(res.status).toBe(400);
    });

    it("should validate minimum rating", async () => {
      const res = await request(createApp())
        .post("/api/reviews")
        .send({ rating: 0 });
      expect(res.status).toBe(400);
    });
  });
});
