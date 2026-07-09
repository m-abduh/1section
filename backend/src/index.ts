import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { connectRedis, disconnectRedis } from "./lib/redis";
import { initWebSocket } from "./lib/websocket";
import { AiCron } from "./modules/ai/ai.cron";

function validateEnv() {
  if (env.nodeEnv !== "production") return;
  const required = [
    ["GOOGLE_CLIENT_ID", env.google.clientId],
    ["GOOGLE_CLIENT_SECRET", env.google.clientSecret],
    ["LEMONSQUEEZY_WEBHOOK_SECRET", env.lemonSqueezy.webhookSecret],
    ["LEMONSQUEEZY_STORE_ID", env.lemonSqueezy.storeId],
  ];
  const missing = required.filter(([, val]) => !val).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `FATAL: Required environment variables missing in production: ${missing.join(", ")}`
    );
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

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  await disconnectRedis();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  await disconnectRedis();
  process.exit(0);
});
