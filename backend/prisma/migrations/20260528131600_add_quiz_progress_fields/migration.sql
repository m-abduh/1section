-- CreateEnum
CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "currentQuestion" INTEGER,
ADD COLUMN     "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ALTER COLUMN "score" SET DEFAULT 0,
ALTER COLUMN "totalQuestions" SET DEFAULT 0,
ALTER COLUMN "percentage" SET DEFAULT 0;
