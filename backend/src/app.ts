import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import type { IncomingMessage } from "http";
import { getRedis } from "./lib/redis";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";

declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

import authRoutes from "./modules/auth/auth.routes";
import categoriesRoutes from "./modules/categories/categories.routes";
import modulesRoutes from "./modules/modules/modules.routes";
import progressRoutes from "./modules/progress/progress.routes";
import reflectionsRoutes from "./modules/reflections/reflections.routes";
import favoritesRoutes from "./modules/favorites/favorites.routes";
import quizRoutes from "./modules/quiz/quiz.routes";
import actionsRoutes from "./modules/actions/actions.routes";
import paymentsRoutes from "./modules/payments/payments.routes";
import reviewsRoutes from "./modules/reviews/reviews.routes";
import notebooksRoutes from "./modules/notebooks/notebooks.routes";
import aiRoutes from "./modules/ai/ai.routes";
import adminRoutes from "./modules/admin/admin.routes";

const app = express();

app.set("trust proxy", 1);

// Security — relaxed for Google OAuth popup
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    ...(env.nodeEnv === "production" && {
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  })
);

// CORS
const allowedOrigins = [
  "https://1section.com",
  "https://dashboard.1section.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing — raw body for webhook verification (accept LS content-type)
app.use(
  express.json({
    limit: "1mb",
    type: ["application/json", "application/vnd.api+json"],
    verify: (req: IncomingMessage, _res, buf) => {
      (req as express.Request).rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// Logging
if (env.nodeEnv === "development") {
  app.use(morgan("dev"));
}

// Rate limiting — 100 requests per minute (excludes webhook)
const redisClient = getRedis();
function createRedisStore() {
  if (!redisClient) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => (redisClient as any).call(...args) as any,
  });
}
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skip: (req) => req.path.endsWith("/webhook"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, please try again later.", statusCode: 429 } },
  store: createRedisStore(),
});
app.use("/api", limiter);

// Stricter rate limit for auth endpoints (login/register)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many login attempts, please try again later.", statusCode: 429 } },
  store: createRedisStore(),
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Health check
app.get("/api/health", async (_req, res) => {
  const checks: Record<string, string> = {};

  // Check Redis
  const redis = getRedis();
  if (redis) {
    try {
      await redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }
  } else {
    checks.redis = "not-configured";
  }

  const allOk = Object.values(checks).every((s) => s === "ok" || s === "not-configured");
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/reflections", reflectionsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/actions", actionsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/notebooks", notebooksRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: { message: "Route not found", statusCode: 404 } });
});

// Error handler
app.use(errorHandler);

export default app;
