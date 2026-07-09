import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import type { SubmitAnswerInput, SaveProgressInput } from "./quiz.schema";

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

    let score = 0;
    const results = input.answers.map((answer) => {
      const question = mod.questions.find((q) => q.id === answer.questionId);
      if (!question) return { questionId: answer.questionId, correct: false, correctAnswer: 0, explanation: "" };

      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      if (isCorrect) score++;

      return {
        questionId: answer.questionId,
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      };
    });

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
            answers: JSON.parse(JSON.stringify(input.answers)),
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
            answers: JSON.parse(JSON.stringify(input.answers)),
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

    let correctCount = 0;
    const questions = await prisma.question.findMany({
      where: { moduleId: mod.id },
      select: { id: true, correctAnswer: true },
    });

    input.answers.forEach((a) => {
      const q = questions.find((q) => q.id === a.questionId);
      if (q && a.selectedAnswer === q.correctAnswer) correctCount++;
    });

    const attempt = await prisma.$transaction(async (tx) => {
      const existing = await tx.quizAttempt.findFirst({
        where: { userId, moduleId: mod.id, status: "IN_PROGRESS" },
        orderBy: { completedAt: "desc" },
        take: 1,
      });

      const updateData = {
        answers: JSON.parse(JSON.stringify(input.answers)),
        currentQuestion: input.currentQuestion,
        score: correctCount,
        totalQuestions: questions.length,
        percentage: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
      };

      if (existing) {
        return tx.quizAttempt.update({
          where: { id: existing.id },
          data: updateData,
          select: { id: true },
        });
      }

      return tx.quizAttempt.create({
        data: {
          userId,
          moduleId: mod.id,
          ...updateData,
          status: "IN_PROGRESS",
        },
        select: { id: true },
      });
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
    const [attempts, totalQuestions] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId, status: "COMPLETED" },
      }),
      prisma.quizAttempt.aggregate({
        where: { userId, status: "COMPLETED" },
        _sum: { totalQuestions: true },
      }),
    ]);

    const totalQuizzesTaken = attempts.length;
    let totalCorrect = 0;
    let totalAnswered = 0;

    attempts.forEach((a) => {
      totalCorrect += a.score;
      totalAnswered += a.totalQuestions;
    });

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
