import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import notebooksRoutes from "./notebooks.routes";

const { mockPrisma, MockPrismaError } = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, code: string) { super(message); this.code = code; }
  }
  return {
    mockPrisma: {
      notebookEntry: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
      module: { findUnique: vi.fn() },
      $disconnect: vi.fn(),
    },
    MockPrismaError: PrismaClientKnownRequestError,
  };
});

vi.mock("../../lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: MockPrismaError },
}));
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
  app.use("/api/notebooks", notebooksRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeEntry(overrides: Record<string, any> = {}) {
  return {
    id: "entry-1",
    userId: "user-1",
    moduleId: "mod-1",
    nodeId: "n1",
    nodeLabel: "Introduction",
    slideIndex: 0,
    slideContent: "Slide content",
    content: "My notes",
    createdAt: new Date(),
    updatedAt: new Date(),
    module: { slug: "test-module", title: "Test Module", category: { name: "Mindset" } },
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Notebooks API", () => {
  describe("GET /api/notebooks", () => {
    it("should list user notebook entries", async () => {
      mockPrisma.notebookEntry.findMany.mockResolvedValue([fakeEntry()]);
      const res = await request(createApp()).get("/api/notebooks");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].nodeLabel).toBe("Introduction");
    });

    it("should return empty list", async () => {
      mockPrisma.notebookEntry.findMany.mockResolvedValue([]);
      const res = await request(createApp()).get("/api/notebooks");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/notebooks/:moduleSlug/:nodeId/:slideIndex", () => {
    it("should return entry by slide", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.notebookEntry.findUnique.mockResolvedValue(fakeEntry());
      const res = await request(createApp()).get("/api/notebooks/test-module/n1/0");
      expect(res.status).toBe(200);
      expect(res.body.content).toBe("My notes");
    });

    it("should return null for unfound entry", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.notebookEntry.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/notebooks/test-module/n1/99");
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/notebooks/nonexistent/n1/0");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/notebooks", () => {
    it("should upsert notebook entry", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.notebookEntry.upsert.mockResolvedValue(fakeEntry());
      const res = await request(createApp())
        .post("/api/notebooks")
        .send({ moduleSlug: "test-module", nodeId: "n1", nodeLabel: "Introduction", slideIndex: 0, slideContent: "Content", content: "Notes" });
      expect(res.status).toBe(200);
      expect(res.body.content).toBe("My notes");
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp())
        .post("/api/notebooks")
        .send({ moduleSlug: "nonexistent", nodeId: "n1", nodeLabel: "Intro", slideIndex: 0, slideContent: "C", content: "N" });
      expect(res.status).toBe(404);
    });

    it("should validate input", async () => {
      const res = await request(createApp()).post("/api/notebooks").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/notebooks/:moduleSlug/:nodeId/:slideIndex", () => {
    it("should delete notebook entry", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.notebookEntry.delete.mockResolvedValue(fakeEntry());
      const res = await request(createApp()).delete("/api/notebooks/test-module/n1/0");
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).delete("/api/notebooks/nonexistent/n1/0");
      expect(res.status).toBe(404);
    });

    it("should return 404 for nonexistent entry", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      const P20025 = MockPrismaError;
      mockPrisma.notebookEntry.delete.mockRejectedValue(new P20025("Not found", "P2025"));
      const res = await request(createApp()).delete("/api/notebooks/test-module/n1/99");
      expect(res.status).toBe(404);
    });
  });
});
