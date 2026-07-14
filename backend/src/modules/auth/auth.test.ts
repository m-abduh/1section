import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import authRoutes from "./auth.routes";

const { mockPrisma, mockOAuth2Client, mockGoogleClient } = vi.hoisted(() => {
  const client = {
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({ sub: "google-123", email: "google@test.com", name: "Google User", picture: "https://pic.com/1" }),
    }),
    getToken: vi.fn().mockResolvedValue({ tokens: { id_token: "mock-token" } }),
  };
  return {
    mockPrisma: {
      user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
      $disconnect: vi.fn(),
    },
    mockOAuth2Client: vi.fn().mockImplementation(function () { return client; }),
    mockGoogleClient: client,
  };
});

vi.mock("../../lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../../lib/cache", () => ({
  Cache: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn(), delByPattern: vi.fn(), key: vi.fn(), PREFIXES: {} },
}));

const { mockBcryptHash, mockBcryptCompare } = vi.hoisted(() => ({
  mockBcryptHash: vi.fn().mockResolvedValue("$2a$12$hashed"),
  mockBcryptCompare: vi.fn().mockResolvedValue(true as never),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash, compare: mockBcryptCompare },
  hash: mockBcryptHash,
  compare: mockBcryptCompare,
}));

const { mockSignToken, mockVerifyToken } = vi.hoisted(() => ({
  mockSignToken: vi.fn().mockReturnValue("test-token"),
  mockVerifyToken: vi.fn().mockReturnValue({ userId: "user-1", email: "user@test.com", role: "USER" }),
}));

vi.mock("../../lib/jwt", () => ({
  signToken: mockSignToken,
  verifyToken: mockVerifyToken,
}));

vi.mock("google-auth-library", () => ({ OAuth2Client: mockOAuth2Client }));

vi.mock("../../config/env", () => ({
  env: {
    google: { clientId: "test-client-id" },
    cookie: { secure: false, domain: undefined },
    adminEmail: null,
    redis: { url: "" },
  },
}));

vi.mock("../../middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: "user-1", email: "user@test.com", role: "ADMIN" };
    next();
  },
  authorize: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (req.user && roles.includes(req.user.role)) return next();
    res.status(403).json({ error: { message: "Forbidden", statusCode: 403 } });
  },
  optionalAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: "user-1", email: "user@test.com", role: "ADMIN" };
    next();
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeUser(overrides: Record<string, any> = {}) {
  return {
    id: "user-1",
    email: "user@test.com",
    passwordHash: "$2a$12$hashed",
    name: "Test User",
    avatar: null,
    role: "USER",
    subscriptionStatus: "FREE",
    subscriptionEnd: null,
    preferredCategories: [],
    googleId: null,
    streakCount: 0,
    lastActiveDate: null,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockBcryptCompare.mockResolvedValue(true as never);
  mockBcryptHash.mockResolvedValue("$2a$12$hashed");
  mockSignToken.mockReturnValue("test-token");
  mockVerifyToken.mockReturnValue({ userId: "user-1", email: "user@test.com", role: "USER" });
  mockGoogleClient.verifyIdToken.mockResolvedValue({
    getPayload: () => ({ sub: "google-123", email: "google@test.com", name: "Google User", picture: "https://pic.com/1" }),
  });
  mockGoogleClient.getToken.mockResolvedValue({ tokens: { id_token: "mock-token" } });
});

describe("Auth API", () => {
  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(fakeUser());
      const res = await request(createApp())
        .post("/api/auth/register")
        .send({ email: "new@test.com", password: "password123", confirmPassword: "password123", name: "New User" });
      expect(res.status).toBe(201);
      expect(res.body.token).toBe("test-token");
      expect(res.body.user.email).toBe("user@test.com");
    });

    it("should reject duplicate email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser());
      const res = await request(createApp())
        .post("/api/auth/register")
        .send({ email: "user@test.com", password: "password123", confirmPassword: "password123" });
      expect(res.status).toBe(409);
    });

    it("should reject mismatched passwords", async () => {
      const res = await request(createApp())
        .post("/api/auth/register")
        .send({ email: "new@test.com", password: "password123", confirmPassword: "different" });
      expect(res.status).toBe(400);
    });

    it("should reject short password", async () => {
      const res = await request(createApp())
        .post("/api/auth/register")
        .send({ email: "new@test.com", password: "short", confirmPassword: "short" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const bcrypt = await import("bcryptjs");
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser());
      const res = await request(createApp())
        .post("/api/auth/login")
        .send({ email: "user@test.com", password: "password123" });
      expect(res.status).toBe(200);
      expect(res.body.token).toBe("test-token");
    });

    it("should reject invalid email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(createApp())
        .post("/api/auth/login")
        .send({ email: "wrong@test.com", password: "password123" });
      expect(res.status).toBe(401);
    });

    it("should reject wrong password", async () => {
      const bcrypt = await import("bcryptjs");
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser());
      const res = await request(createApp())
        .post("/api/auth/login")
        .send({ email: "user@test.com", password: "wrongpassword" });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/google", () => {
    it("should authenticate with Google", async () => {
      const user = fakeUser({ googleId: "google-123" });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(user);
      const res = await request(createApp())
        .post("/api/auth/google")
        .send({ idToken: "valid-google-token" });
      expect(res.status).toBe(200);
      expect(res.body.token).toBe("test-token");
    });

    it("should handle auth code exchange", async () => {
      mockGoogleClient.verifyIdToken
        .mockRejectedValueOnce(new Error("Invalid token"))
        .mockResolvedValueOnce({
          getPayload: () => ({ sub: "google-123", email: "google@test.com", name: "Google User", picture: "https://pic.com/1" }),
        });
      mockGoogleClient.getToken.mockResolvedValue({ tokens: { id_token: "exchanged-token" } });
      const user = fakeUser({ googleId: "google-123" });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(user);
      const res = await request(createApp())
        .post("/api/auth/google")
        .send({ idToken: "x".repeat(51) });
      expect(res.status).toBe(200);
    });

    it("should reject completely invalid Google token", async () => {
      mockGoogleClient.verifyIdToken.mockRejectedValue(new Error("Invalid token"));
      mockGoogleClient.getToken.mockRejectedValue(new Error("Code exchange failed"));
      const res = await request(createApp())
        .post("/api/auth/google")
        .send({ idToken: "short-token" });
      expect(res.status).toBe(401);
    });

    it("should reject invalid token", async () => {
      const res = await request(createApp())
        .post("/api/auth/google")
        .send({ idToken: "" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear auth cookie", async () => {
      const res = await request(createApp()).post("/api/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user profile", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser());
      const res = await request(createApp()).get("/api/auth/me");
      expect(res.status).toBe(200);
      expect(res.body.email).toBe("user@test.com");
    });

    it("should return 404 for user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/auth/me");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/auth/profile", () => {
    it("should update profile", async () => {
      mockPrisma.user.update.mockResolvedValue(fakeUser({ name: "Updated Name" }));
      const res = await request(createApp()).put("/api/auth/profile").send({ name: "Updated Name" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Name");
    });

    it("should validate input", async () => {
      const res = await request(createApp()).put("/api/auth/profile").send({ name: "" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/preferences", () => {
    it("should return preferences", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ preferredCategories: ["Mindset", "Focus"] }));
      const res = await request(createApp()).get("/api/auth/preferences");
      expect(res.status).toBe(200);
      expect(res.body.preferredCategories).toEqual(["Mindset", "Focus"]);
    });

    it("should return 404 for user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/auth/preferences");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/auth/preferences", () => {
    it("should update preferences", async () => {
      mockPrisma.user.update.mockResolvedValue({ preferredCategories: ["Mindset"] });
      const res = await request(createApp()).put("/api/auth/preferences").send({ preferredCategories: ["Mindset"] });
      expect(res.status).toBe(200);
    });

    it("should reject empty categories", async () => {
      const res = await request(createApp()).put("/api/auth/preferences").send({ preferredCategories: [] });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/users", () => {
    it("should list users for admin", async () => {
      mockPrisma.user.findMany.mockResolvedValue([fakeUser()]);
      const app = express();
      app.use(express.json());
      app.use("/api/auth", authRoutes);
      app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
      app.use(errorHandler);
      const res = await request(app).get("/api/auth/users");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });
});
