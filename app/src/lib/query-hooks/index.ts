"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { modulesApi } from "@/lib/api/modules";
import { favoritesApi } from "@/lib/api/favorites";
import { reflectionsApi } from "@/lib/api/reflections";
import { actionsApi } from "@/lib/api/actions";
import { progressApi } from "@/lib/api/progress";
import { quizApi } from "@/lib/api/quiz";
import { notebooksApi } from "@/lib/api/notebooks";
import { paymentsApi } from "@/lib/api/payments";
import { useAuthStore } from "@/lib/store/auth";
import type { CategoryWithCount, ModuleListItem } from "@/lib/types";

// ─── Categories ───

export function useCategories() {
  return useQuery<CategoryWithCount[]>({
    queryKey: ["categories"],
    queryFn: () => modulesApi.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Modules List ───

export function useModulesList(params?: {
  page?: string;
  limit?: string;
  category?: string;
  categories?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["modules", params],
    queryFn: () => modulesApi.list(params),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Module Detail ───

export function useModule(slug: string) {
  return useQuery({
    queryKey: ["module", slug],
    queryFn: () => modulesApi.getBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Daily Free ───

export function useDailyFree() {
  return useQuery({
    queryKey: ["daily-free"],
    queryFn: () => modulesApi.getDailyFree(),
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Recommended ───

export function useRecommended(slug: string) {
  return useQuery({
    queryKey: ["module", slug, "recommended"],
    queryFn: () => modulesApi.getRecommended(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Favorites ───

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoritesApi.list(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, isFavorited }: { slug: string; isFavorited: boolean }) => {
      if (isFavorited) await favoritesApi.remove(slug);
      else await favoritesApi.add(slug);
    },
    onMutate: async ({ slug }) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const prev = qc.getQueryData(["favorites"]);
      qc.setQueryData(["favorites"], (old: any) => {
        if (!old) return old;
        return old.filter((m: any) => m.slug !== slug);
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorites"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

// ─── Reflections ───

export function useReflections() {
  return useQuery({
    queryKey: ["reflections"],
    queryFn: () => reflectionsApi.list(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateReflection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reflectionsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reflections"] }),
  });
}

export function useDeleteReflection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reflectionsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reflections"] }),
  });
}

// ─── Action Plans ───

export function useActionPlans() {
  return useQuery({
    queryKey: ["action-plans"],
    queryFn: () => actionsApi.list(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useActionPlanByModule(moduleId: string) {
  return useQuery({
    queryKey: ["action-plan", moduleId],
    queryFn: () => actionsApi.getByModule(moduleId),
    enabled: !!moduleId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: actionsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-plans"] }),
  });
}

export function useUpdateActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; content?: any; completed?: boolean }) =>
      actionsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-plans"] }),
  });
}

export function useDeleteActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: actionsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-plans"] }),
  });
}

// ─── Progress ───

export function useProgress(slug: string) {
  return useQuery({
    queryKey: ["progress", slug],
    queryFn: () => progressApi.getBySlug(slug),
    enabled: !!slug,
    staleTime: 30 * 1000,
  });
}

export function useContinueLearning() {
  return useQuery({
    queryKey: ["continue-learning"],
    queryFn: () => progressApi.getContinueLearning(),
    staleTime: 30 * 1000,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => progressApi.getStats(),
    staleTime: 30 * 1000,
  });
}

export function useStreak() {
  return useQuery({
    queryKey: ["streak"],
    queryFn: () => progressApi.getStreak(),
    staleTime: 60 * 1000,
  });
}

export function useResetStreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: progressApi.resetStreak,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streak"] }),
  });
}

export function useSaveProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, ...body }: { slug: string } & Parameters<typeof progressApi.upsert>[1]) =>
      progressApi.upsert(slug, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["continue-learning"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["module", variables.slug] });
    },
  });
}

// ─── Quiz ───

export function useQuizQuestions(slug: string) {
  return useQuery({
    queryKey: ["quiz", slug, "questions"],
    queryFn: () => quizApi.getQuestions(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: ({ slug, answers }: { slug: string; answers: { questionId: string; selectedAnswer: number }[] }) =>
      quizApi.submit(slug, { answers }),
  });
}

export function useSaveQuizProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, answers, currentQuestion }: { slug: string; answers: { questionId: string; selectedAnswer: number }[]; currentQuestion: number }) =>
      quizApi.saveProgress(slug, { answers, currentQuestion }),
    onSuccess: (_data, { slug }) => qc.invalidateQueries({ queryKey: ["quiz", slug, "progress"] }),
  });
}

export function useQuizProgress(slug: string) {
  return useQuery({
    queryKey: ["quiz", slug, "progress"],
    queryFn: () => quizApi.getProgress(slug),
    enabled: !!slug,
    staleTime: 10 * 1000,
  });
}

export function useQuizStats() {
  return useQuery({
    queryKey: ["quiz-stats"],
    queryFn: () => quizApi.getQuizStats(),
    staleTime: 60 * 1000,
  });
}

// ─── Payments / Subscription ───

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: () => paymentsApi.getSubscription(),
    staleTime: 60 * 1000,
  });
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: ["payment-history"],
    queryFn: () => paymentsApi.getHistory(),
    staleTime: 60 * 1000,
  });
}

// ─── Notebook ───

export function useNotebook() {
  return useQuery({
    queryKey: ["notebook"],
    queryFn: () => notebooksApi.list(),
    staleTime: 30 * 1000,
  });
}

export function useNotebookBySlide(
  moduleSlug: string,
  nodeId: string,
  slideIndex: number,
) {
  return useQuery({
    queryKey: ["notebook", moduleSlug, nodeId, slideIndex],
    queryFn: () => notebooksApi.getBySlide(moduleSlug, nodeId, slideIndex),
    enabled: !!moduleSlug && !!nodeId,
    staleTime: 0,
  });
}

export function useUpsertNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notebooksApi.upsert,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["notebook"] });
      qc.invalidateQueries({
        queryKey: ["notebook", variables.moduleSlug, variables.nodeId, variables.slideIndex],
      });
    },
  });
}

export function useDeleteNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleSlug, nodeId, slideIndex }: { moduleSlug: string; nodeId: string; slideIndex: number }) =>
      notebooksApi.remove(moduleSlug, nodeId, slideIndex),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notebook"] }),
  });
}

// ─── All Progress (for dashboard) ───

export function useAllProgress() {
  return useQuery({
    queryKey: ["all-progress"],
    queryFn: () => progressApi.getAll(),
    staleTime: 30 * 1000,
  });
}
