import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import quizRoutes from "./quiz.routes";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    module: { findUnique: vi.fn() },
    question: { findMany: vi.fn() },
    quizAttempt: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
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
  app.use("/api/quiz", quizRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeQuestion(overrides: Record<string, any> = {}) {
  return {
    id: "q1",
    question: "What is X?",
    options: ["A", "B", "C", "D"],
    correctAnswer: 0,
    explanation: "X is...",
    ...overrides,
  };
}

function fakeAttempt(overrides: Record<string, any> = {}) {
  return {
    id: "attempt-1",
    userId: "user-1",
    moduleId: "mod-1",
    score: 4,
    totalQuestions: 5,
    percentage: 80,
    status: "COMPLETED",
    answers: [{ questionId: "q1", selectedAnswer: 0 }],
    currentQuestion: 4,
    completedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Quiz API", () => {
  describe("GET /api/quiz/:slug/questions", () => {
    it("should return questions", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: "mod-1",
        slug: "test-module",
        questions: [fakeQuestion()],
      });
      const res = await request(createApp()).get("/api/quiz/test-module/questions");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].question).toBe("What is X?");
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/quiz/nonexistent/questions");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/quiz/:slug/submit", () => {
    it("should submit answers", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: "mod-1", slug: "test-module",
        questions: [fakeQuestion()],
      });
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(null);
      mockPrisma.quizAttempt.create.mockResolvedValue(fakeAttempt());
      const res = await request(createApp())
        .post("/api/quiz/test-module/submit")
        .send({ answers: [{ questionId: "q1", selectedAnswer: 0 }] });
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(1);
      expect(res.body.totalQuestions).toBe(1);
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp())
        .post("/api/quiz/nonexistent/submit")
        .send({ answers: [] });
      expect(res.status).toBe(404);
    });

    it("should return 404 for module with no questions", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module", questions: [] });
      const res = await request(createApp())
        .post("/api/quiz/test-module/submit")
        .send({ answers: [] });
      expect(res.status).toBe(404);
    });

    it("should validate input", async () => {
      const res = await request(createApp())
        .post("/api/quiz/test-module/submit")
        .send({});
      expect(res.status).toBe(400);
    });

    it("should update existing in-progress attempt", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: "mod-1", slug: "test-module",
        questions: [fakeQuestion()],
      });
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({ id: "attempt-1" });
      mockPrisma.quizAttempt.update.mockResolvedValue(fakeAttempt());
      const res = await request(createApp())
        .post("/api/quiz/test-module/submit")
        .send({ answers: [{ questionId: "q1", selectedAnswer: 0 }] });
      expect(res.status).toBe(200);
    });
  });

  describe("PUT /api/quiz/:slug/progress", () => {
    it("should save progress", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.question.findMany.mockResolvedValue([{ id: "q1", correctAnswer: 0 }]);
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(null);
      mockPrisma.quizAttempt.create.mockResolvedValue({ id: "attempt-1" });
      const res = await request(createApp())
        .put("/api/quiz/test-module/progress")
        .send({ answers: [{ questionId: "q1", selectedAnswer: 0 }], currentQuestion: 0 });
      expect(res.status).toBe(200);
      expect(res.body.attemptId).toBe("attempt-1");
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp())
        .put("/api/quiz/nonexistent/progress")
        .send({ answers: [], currentQuestion: 0 });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/quiz/:slug/progress", () => {
    it("should return progress", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(fakeAttempt({ status: "IN_PROGRESS" }));
      const res = await request(createApp()).get("/api/quiz/test-module/progress");
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(4);
    });

    it("should return null when no in-progress attempt", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/quiz/test-module/progress");
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it("should return null for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/quiz/nonexistent/progress");
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe("GET /api/quiz/:slug/attempts", () => {
    it("should list attempts", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ id: "mod-1", slug: "test-module" });
      mockPrisma.quizAttempt.findMany.mockResolvedValue([fakeAttempt()]);
      const res = await request(createApp()).get("/api/quiz/test-module/attempts");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should return 404 for nonexistent module", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/quiz/nonexistent/attempts");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/quiz/stats/overview", () => {
    it("should return quiz stats", async () => {
      mockPrisma.quizAttempt.aggregate.mockResolvedValue({
        _count: 10,
        _sum: { score: 80, totalQuestions: 100 },
      });
      const res = await request(createApp()).get("/api/quiz/stats/overview");
      expect(res.status).toBe(200);
      expect(res.body.totalQuizzesTaken).toBe(10);
      expect(res.body.averagePercentage).toBe(80);
      expect(res.body.quizXp).toBe(800);
    });

    it("should handle zero quizzes", async () => {
      mockPrisma.quizAttempt.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { score: 0, totalQuestions: 0 },
      });
      const res = await request(createApp()).get("/api/quiz/stats/overview");
      expect(res.status).toBe(200);
      expect(res.body.averagePercentage).toBe(0);
    });
  });
});
