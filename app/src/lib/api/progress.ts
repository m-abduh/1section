import { api } from "@/lib/axios";
import type { UserProgress, ProgressStats } from "@/lib/types";

export interface ContinueLearningItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
  listeningProgress: number;
  readingProgress: number;
  completed: boolean;
  totalNodes: number;
  completedNodes: number;
  lastReadAt: number;
}

export const progressApi = {
  getAll: () =>
    api.get<UserProgress[]>("/progress").then(r => r.data),

  getBySlug: (slug: string) =>
    api.get<UserProgress | null>(`/progress/${slug}`).then(r => r.data),

  upsert: (slug: string, body: Partial<{
    nodeId: string;
    listeningProgress: number;
    readingProgress: number;
    scrollPosition: number;
    currentCharIndex: number;
    audioRate: number;
    completed: boolean;
  }>) =>
    api.put<UserProgress>(`/progress/${slug}`, body).then(r => r.data),

  getContinueLearning: () =>
    api.get<ContinueLearningItem[]>("/progress/continue-learning").then(r => r.data),

  getStats: () =>
    api.get<ProgressStats>("/progress/stats").then(r => r.data),

  getStreak: () =>
    api.get<{ streak: number; showPopup: boolean }>("/progress/streak").then(r => r.data),

  resetStreak: () =>
    api.post<{ streak: number }>("/progress/streak/reset").then(r => r.data),
};
