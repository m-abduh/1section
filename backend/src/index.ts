import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { connectRedis, disconnectRedis } from "./lib/redis";
import { initWebSocket } from "./lib/websocket";
import { AiCron } from "./modules/ai/ai.cron";

function validateEnv() {
  const required = [
    ["GOOGLE_CLIENT_ID", env.google.clientId],
    ["GOOGLE_CLIENT_SECRET", env.google.clientSecret],
    ["LEMONSQUEEZY_WEBHOOK_SECRET", env.lemonSqueezy.webhookSecret],
    ["LEMONSQUEEZY_STORE_ID", env.lemonSqueezy.storeId],
  ];
  const missing = required.filter(([, val]) => !val).map(([name]) => name);
  if (missing.length > 0) {
    if (env.nodeEnv === "production") {
      throw new Error(
        `FATAL: Required environment variables missing in production: ${missing.join(", ")}`
      );
    }
    console.warn(`WARNING: Missing non-critical env vars: ${missing.join(", ")}`);
  }
}

async function main() {
  try {
    validateEnv();
    await prisma.$connect();
    console.log("Database connected");

    await connectRedis();

    const server = createServer(app);
    initWebSocket(server);

    await AiCron.restoreOnStartup();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log("HTTP server closed");
      });
      await prisma.$disconnect();
      await disconnectRedis();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    server.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
      console.log(`Environment: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
