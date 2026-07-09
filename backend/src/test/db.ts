import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { execSync } from "child_process";

let prisma: PrismaClient | null = null;

export async function getTestDb(): Promise<PrismaClient> {
  if (prisma) return prisma;

  const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");

  const pool = new Pool({ connectionString: dbUrl, max: 5 });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });

  execSync("npx prisma db push --force-reset --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: dbUrl },
    cwd: process.cwd(),
    stdio: "pipe",
  });

  return prisma;
}

export async function closeTestDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export async function cleanDb(prisma: PrismaClient): Promise<void> {
  await prisma.moduleEdge.deleteMany();
  await prisma.moduleNode.deleteMany();
  await prisma.question.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.reflection.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.actionPlan.deleteMany();
  await prisma.review.deleteMany();
  await prisma.notebookEntry.deleteMany();
  await prisma.cronJob.deleteMany();
  await prisma.module.deleteMany();
  await prisma.category.deleteMany();
}