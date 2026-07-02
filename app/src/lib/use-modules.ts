"use client";

import { useQuery } from "@tanstack/react-query";
import { modulesApi } from "@/lib/api/modules";
import { progressApi, type ContinueLearningItem } from "@/lib/api/progress";
import { useAuthStore } from "@/lib/store/auth";
import type { ModuleListItem } from "@/lib/types";

interface HistoryModule extends ModuleListItem {
  progress: {
    listeningProgress: number;
    readingProgress: number;
    completed: boolean;
    totalNodes: number;
    completedNodes: number;
    lastReadAt: number;
  };
}

export function useModules(page: number, category: string | null, search: string, categories?: string[] | null) {
  const token = useAuthStore((s) => s.token);

  const params: Record<string, string> = { page: String(page), limit: "6" };
  if (category) params.category = category;
  else if (categories && categories.length > 0) params.categories = categories.join(",");
  if (search) params.search = search;

  const modulesQuery = useQuery({
    queryKey: ["modules", params],
    queryFn: () => modulesApi.list(params),
    staleTime: 2 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => modulesApi.getCategories(),
    staleTime: 10 * 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ["continue-learning"],
    queryFn: () => progressApi.getContinueLearning(),
    enabled: !!token,
    staleTime: 30 * 1000,
  });

  const historyModules: HistoryModule[] = (historyQuery.data || []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    category: p.category,
    isPremium: p.isPremium,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    nodes: [],
    edges: [],
    progress: {
      listeningProgress: p.listeningProgress,
      readingProgress: p.readingProgress,
      completed: p.completed,
      totalNodes: p.totalNodes,
      completedNodes: p.completedNodes,
      lastReadAt: p.lastReadAt,
    },
  }));

  return {
    modules: modulesQuery.data?.data || [],
    categories: categoriesQuery.data?.map(c => c.name) || [],
    historyModules,
    totalPages: modulesQuery.data?.pagination?.totalPages || 1,
    total: modulesQuery.data?.pagination?.total || 0,
    loading: modulesQuery.isLoading,
    error: modulesQuery.error ? (modulesQuery.error as Error).message : null,
    fetchHistory: () => historyQuery.refetch(),
  };
}
