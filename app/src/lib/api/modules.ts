import { api } from "@/lib/axios";
import type { Module, ModuleListItem, PaginatedResponse, CategoryWithCount } from "@/lib/types";

export const modulesApi = {
  list: (params?: { page?: string; limit?: string; category?: string; categories?: string; search?: string }) =>
    api.get<PaginatedResponse<ModuleListItem>>("/modules", { params }).then(r => r.data),

  getBySlug: (slug: string) =>
    api.get<Module>(`/modules/${slug}`).then(r => r.data),

  getDailyFree: () =>
    api.get<Module>("/modules/daily-free").then(r => r.data),

  checkAccess: (slug: string) =>
    api.get<{ accessible: boolean; isDailyFree: boolean }>(`/modules/${slug}/access`).then(r => r.data),

  getCategories: () =>
    api.get<CategoryWithCount[]>("/modules/categories").then(r => r.data),

  getRecommended: (slug: string) =>
    api.get<Module[]>(`/modules/${slug}/recommended`).then(r => r.data),
};
