import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Load env before vitest processes test files
dotenv.config();

if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
  throw new Error("Set TEST_DATABASE_URL or DATABASE_URL env var");
}

// Make sure DATABASE_URL is set for Prisma during import phase
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/modules/categories/**/*.ts", "src/modules/modules/**/*.ts"],
      reporter: ["text", "lcov"],
    },
  },
});