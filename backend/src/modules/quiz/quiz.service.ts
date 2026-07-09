import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import type { SubmitAnswerInput, SaveProgressInput } from "./quiz.schema";

function scoreAnswers(
  userAnswers: { questionId: string; selectedAnswer: number }[],
  questions: { id: string; correctAnswer: number; explanation?: string }[]
) {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  let score = 0;
  const results = userAnswers.map((answer) => {
    const question = questionMap.get(answer.questionId);
    if (!question) return { questionId: answer.questionId, correct: false, correctAnswer: 0, explanation: "" };
    const isCorrect = answer.selectedAnswer === question.correctAnswer;
    if (isCorrect) score++;
    return {
      questionId: answer.questionId,
      correct: isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation ?? "",
    };
  });
  return { score, results };
}

export namespace QuizService {
  export async function getQuestions(slug: string) {
    const mod = await prisma.module.findUnique({
      where: { slug },
      include: {
        questions: {
          select: {
            id: true,
            question: true,
            options: true,
            explanation: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!mod) throw new NotFoundError("Module");
    return mod.questions;
  }

  export async function submit(userId: string, slug: string, input: SubmitAnswerInput) {
    const mod = await prisma.module.findUnique({
      where: { slug },
      include: { questions: true },
    });

    if (!mod) throw new NotFoundError("Module");
    if (mod.questions.length === 0) {
      throw new NotFoundError("Questions");
    }

    const { score, results } = scoreAnswers(input.answers, mod.questions);

    const totalQuestions = mod.questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    const existing = await prisma.quizAttempt.findFirst({
      where: { userId, moduleId: mod.id, status: "IN_PROGRESS" },
      orderBy: { completedAt: "desc" },
      select: { id: true },
    });

    const attempt = existing
      ? await prisma.quizAttempt.update({
          where: { id: existing.id },
          data: {
            score,
            totalQuestions,
            percentage,
            status: "COMPLETED",
            answers: structuredClone(input.answers),
            currentQuestion: totalQuestions - 1,
          },
        })
      : await prisma.quizAttempt.create({
          data: {
            userId,
            moduleId: mod.id,
            score,
            totalQuestions,
            percentage,
            status: "COMPLETED",
            answers: structuredClone(input.answers),
            currentQuestion: totalQuestions - 1,
          },
        });

    return {
      attemptId: attempt.id,
      score,
      totalQuestions,
      percentage,
      results,
    };
  }

  export async function saveProgress(userId: string, slug: string, input: SaveProgressInput) {
    const mod = await prisma.module.findUnique({ where: { slug } });
    if (!mod) throw new NotFoundError("Module");

    const questions = await prisma.question.findMany({
      where: { moduleId: mod.id },
      select: { id: true, correctAnswer: true },
    });

    const { score: correctCount } = scoreAnswers(input.answers, questions);

    const existing = await prisma.quizAttempt.findFirst({
      where: { userId, moduleId: mod.id, status: "IN_PROGRESS" },
      orderBy: { completedAt: "desc" },
      take: 1,
    });

    const updateData = {
      answers: structuredClone(input.answers),
      currentQuestion: input.currentQuestion,
      score: correctCount,
      totalQuestions: questions.length,
      percentage: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
    };

    const attempt = existing
      ? await prisma.quizAttempt.update({
          where: { id: existing.id },
          data: updateData,
          select: { id: true },
        })
      : await prisma.quizAttempt.create({
          data: {
            userId,
            moduleId: mod.id,
            ...updateData,
            status: "IN_PROGRESS",
          },
          select: { id: true },
        });

    return { attemptId: attempt.id };
  }

  export async function getProgress(userId: string, slug: string) {
    const mod = await prisma.module.findUnique({ where: { slug } });
    if (!mod) return null;

    const attempt = await prisma.quizAttempt.findFirst({
      where: { userId, moduleId: mod.id, status: "IN_PROGRESS" },
      orderBy: { completedAt: "desc" },
    });

    if (!attempt) return null;

    return {
      id: attempt.id,
      moduleId: attempt.moduleId,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.percentage,
      answers: attempt.answers as { questionId: string; selectedAnswer: number }[] | null,
      currentQuestion: attempt.currentQuestion,
      status: attempt.status,
      completedAt: attempt.completedAt,
    };
  }

  export async function getAttempts(userId: string, slug: string) {
    const mod = await prisma.module.findUnique({ where: { slug } });
    if (!mod) throw new NotFoundError("Module");

    return prisma.quizAttempt.findMany({
      where: { userId, moduleId: mod.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 10,
    });
  }

  export async function getQuizStats(userId: string) {
    const aggregation = await prisma.quizAttempt.aggregate({
      where: { userId, status: "COMPLETED" },
      _count: true,
      _sum: { score: true, totalQuestions: true },
    });

    const totalQuizzesTaken = aggregation._count;
    const totalCorrect = aggregation._sum.score ?? 0;
    const totalAnswered = aggregation._sum.totalQuestions ?? 0;

    const averagePercentage = totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0;

    return {
      totalQuizzesTaken,
      averagePercentage,
      totalCorrect,
      totalAnswered,
      quizXp: totalCorrect * 10,
    };
  }
}
