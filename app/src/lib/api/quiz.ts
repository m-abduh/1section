import { api } from "@/lib/axios";
import type { QuizQuestion, QuizSubmitResponse, QuizAttempt, QuizStats } from "@/lib/types";

export const quizApi = {
  getQuestions: (slug: string) =>
    api.get<QuizQuestion[]>(`/quiz/${slug}/questions`).then(r => r.data),

  submit: (slug: string, body: { answers: { questionId: string; selectedAnswer: number }[] }) =>
    api.post<QuizSubmitResponse>(`/quiz/${slug}/submit`, body).then(r => r.data),

  saveProgress: (slug: string, body: { answers: { questionId: string; selectedAnswer: number }[]; currentQuestion: number }) =>
    api.put<{ attemptId: string }>(`/quiz/${slug}/progress`, body).then(r => r.data),

  getProgress: (slug: string) =>
    api.get<QuizAttempt | null>(`/quiz/${slug}/progress`).then(r => r.data),

  getAttempts: (slug: string) =>
    api.get<QuizAttempt[]>(`/quiz/${slug}/attempts`).then(r => r.data),

  getQuizStats: () =>
    api.get<QuizStats>("/quiz/stats/overview").then(r => r.data),
};
