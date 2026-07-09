import { beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let prisma: PrismaClient;

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set for integration tests");
  }

  const pool = new Pool({ connectionString: dbUrl, max: 5 });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });

  // Push schema
  const { execSync } = await import("child_process");
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: dbUrl },
    cwd: process.cwd(),
    stdio: "pipe",
  });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

export { prisma };