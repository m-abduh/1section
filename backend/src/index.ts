import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { connectRedis, disconnectRedis } from "./lib/redis";
import { initWebSocket } from "./lib/websocket";
import { AiCron } from "./modules/ai/ai.cron";

async function main() {
  try {
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
