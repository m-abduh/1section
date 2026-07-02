import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check if old 'draft' column exists
  const result = await prisma.$queryRawUnsafe<any[]>(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name='Module' AND column_name='draft'`
  );

  if (result.length > 0) {
    console.log("Renaming draft → isDraft");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Module" RENAME COLUMN "draft" TO "isDraft"`);
    console.log("Done");
  } else {
    console.log("Column already renamed or doesn't exist");
  }

  // Set defaults
  await prisma.$executeRawUnsafe(`ALTER TABLE "Module" ALTER COLUMN "isDraft" SET DEFAULT true`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Module" ALTER COLUMN "isPremium" SET DEFAULT true`);
  console.log("Defaults set");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
