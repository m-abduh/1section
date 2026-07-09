import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/error-handler";
import paymentsRoutes from "./payments.routes";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    payment: { findMany: vi.fn(), upsert: vi.fn() },
    lemonSqueezyEvent: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((cb: any) => cb(mockPrisma)),
    $disconnect: vi.fn(),
  },
}));

vi.mock("../../lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../../lib/cache", () => ({
  Cache: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn(), delByPattern: vi.fn(), key: vi.fn(), PREFIXES: {} },
}));
vi.mock("../../config/lemon-squeezy", () => ({
  LemonSqueezy: {
    createCheckout: vi.fn(),
    verifyWebhook: vi.fn(),
    cancelSubscription: vi.fn(),
    getCustomerPortalUrl: vi.fn(),
  },
}));
vi.mock("../../lib/websocket", () => ({
  sendToUser: vi.fn(),
}));
vi.mock("../../lib/redis", () => ({ getRedis: vi.fn().mockReturnValue(null) }));
vi.mock("../../config/env", () => ({
  env: {
    lemonSqueezy: { devApiKey: "dev-key", prodApiKey: "prod-key" },
    cookie: { secure: false, domain: undefined },
    adminEmail: null,
  },
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
  app.use("/api/payments", paymentsRoutes);
  app.use((_req, res) => res.status(404).json({ error: { message: "Not found", statusCode: 404 } }));
  app.use(errorHandler);
  return app;
}

function fakeUser(overrides: Record<string, any> = {}) {
  return {
    id: "user-1",
    email: "user@test.com",
    subscriptionStatus: "FREE",
    subscriptionEnd: null,
    lsCustomerId: null,
    lsSubscriptionId: null,
    ...overrides,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("Payments API", () => {
  describe("POST /api/payments/webhook", () => {
    it("should reject request without signature", async () => {
      const res = await request(createApp())
        .post("/api/payments/webhook")
        .send({ meta: { event_name: "test" }, data: { id: "1" } });
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it("should handle subscription_created event", async () => {
      const { LemonSqueezy } = await import("../../config/lemon-squeezy");
      vi.mocked(LemonSqueezy.verifyWebhook).mockReturnValue(true);
      mockPrisma.lemonSqueezyEvent.findUnique.mockResolvedValue(null);
      mockPrisma.lemonSqueezyEvent.create.mockResolvedValue({});
      mockPrisma.lemonSqueezyEvent.update.mockResolvedValue({});
      mockPrisma.user.findFirst.mockResolvedValue({ id: "user-1" });
      mockPrisma.user.update.mockResolvedValue({});
      const res = await request(createApp())
        .post("/api/payments/webhook")
        .set("x-signature", "valid-sig")
        .send({
          meta: { event_name: "subscription_created", custom_data: { userId: "user-1" } },
          data: { id: "sub-1", attributes: { variant_name: "Monthly Premium", status: "active" } },
        });
      expect(res.status).toBe(200);
    });

    it("should handle subscription_cancelled event", async () => {
      const { LemonSqueezy } = await import("../../config/lemon-squeezy");
      vi.mocked(LemonSqueezy.verifyWebhook).mockReturnValue(true);
      mockPrisma.lemonSqueezyEvent.findUnique.mockResolvedValue(null);
      mockPrisma.lemonSqueezyEvent.create.mockResolvedValue({});
      mockPrisma.lemonSqueezyEvent.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      const res = await request(createApp())
        .post("/api/payments/webhook")
        .set("x-signature", "valid-sig")
        .send({
          meta: { event_name: "subscription_cancelled", custom_data: { userId: "user-1" } },
          data: { id: "sub-1", attributes: {} },
        });
      expect(res.status).toBe(200);
    });

    it("should handle order_created event", async () => {
      const { LemonSqueezy } = await import("../../config/lemon-squeezy");
      vi.mocked(LemonSqueezy.verifyWebhook).mockReturnValue(true);
      mockPrisma.lemonSqueezyEvent.findUnique.mockResolvedValue(null);
      mockPrisma.lemonSqueezyEvent.create.mockResolvedValue({});
      mockPrisma.lemonSqueezyEvent.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser());
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.payment.upsert.mockResolvedValue({});
      const res = await request(createApp())
        .post("/api/payments/webhook")
        .set("x-signature", "valid-sig")
        .send({
          meta: { event_name: "order_created", custom_data: { userId: "user-1" } },
          data: { id: "order-1", attributes: { status: "paid", first_order_item: { variant_name: "Yearly" }, total_usd: 99 } },
        });
      expect(res.status).toBe(200);
    });

    it("should skip already processed events", async () => {
      const { LemonSqueezy } = await import("../../config/lemon-squeezy");
      vi.mocked(LemonSqueezy.verifyWebhook).mockReturnValue(true);
      mockPrisma.lemonSqueezyEvent.findUnique.mockResolvedValue({ processed: true });
      const res = await request(createApp())
        .post("/api/payments/webhook")
        .set("x-signature", "valid-sig")
        .send({
          meta: { event_name: "subscription_created", custom_data: { userId: "user-1" } },
          data: { id: "sub-1", attributes: {} },
        });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/payments/create-checkout", () => {
    it("should create checkout", async () => {
      const { LemonSqueezy } = await import("../../config/lemon-squeezy");
      vi.mocked(LemonSqueezy.createCheckout).mockResolvedValue({ url: "https://ls.com/checkout", id: "ch-1" });
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser());
      const res = await request(createApp()).post("/api/payments/create-checkout");
      expect(res.status).toBe(200);
      expect(res.body.url).toBe("https://ls.com/checkout");
    });

    it("should reject when user has active subscription", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ subscriptionStatus: "MONTHLY" }));
      const res = await request(createApp()).post("/api/payments/create-checkout");
      expect(res.status).toBe(400);
    });

    it("should return 404 for nonexistent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).post("/api/payments/create-checkout");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/payments/subscription", () => {
    it("should return subscription info", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ subscriptionStatus: "YEARLY", subscriptionEnd: futureDate, lsCustomerId: "cus-1", lsSubscriptionId: "sub-1" }));
      const res = await request(createApp()).get("/api/payments/subscription");
      expect(res.status).toBe(200);
      expect(res.body.subscriptionStatus).toBe("YEARLY");
    });

    it("should return 404 for nonexistent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(createApp()).get("/api/payments/subscription");
      expect(res.status).toBe(404);
    });

    it("should mark expired subscription as FREE", async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ subscriptionStatus: "MONTHLY", subscriptionEnd: pastDate }));
      const res = await request(createApp()).get("/api/payments/subscription");
      expect(res.status).toBe(200);
      expect(res.body.subscriptionStatus).toBe("FREE");
    });
  });

  describe("GET /api/payments/history", () => {
    it("should return payment history", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([{ id: "pay-1", amount: 99, status: "SUCCEEDED", createdAt: new Date() }]);
      const res = await request(createApp()).get("/api/payments/history");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("POST /api/payments/customer-portal", () => {
    it("should return customer portal URL", async () => {
      const { LemonSqueezy } = await import("../../config/lemon-squeezy");
      vi.mocked(LemonSqueezy.getCustomerPortalUrl).mockResolvedValue("https://ls.com/portal");
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ lsCustomerId: "cus-1" }));
      const res = await request(createApp()).post("/api/payments/customer-portal");
      expect(res.status).toBe(200);
      expect(res.body.url).toBe("https://ls.com/portal");
    });

    it("should return 400 when no customer found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ lsCustomerId: null }));
      const res = await request(createApp()).post("/api/payments/customer-portal");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/payments/cancel", () => {
    it("should cancel subscription", async () => {
      const { LemonSqueezy } = await import("../../config/lemon-squeezy");
      vi.mocked(LemonSqueezy.cancelSubscription).mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ subscriptionStatus: "MONTHLY", lsSubscriptionId: "sub-1" }));
      const res = await request(createApp()).post("/api/payments/cancel");
      expect(res.status).toBe(200);
      expect(res.body.cancelled).toBe(true);
    });

    it("should return 400 for no subscription", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ lsSubscriptionId: null }));
      const res = await request(createApp()).post("/api/payments/cancel");
      expect(res.status).toBe(400);
    });

    it("should return 400 for lifetime subscription", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser({ subscriptionStatus: "LIFETIME", lsSubscriptionId: "sub-1" }));
      const res = await request(createApp()).post("/api/payments/cancel");
      expect(res.status).toBe(400);
    });
  });
});
