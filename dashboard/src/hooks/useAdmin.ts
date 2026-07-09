import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface DashboardUser {
  id: string;
  email: string;
  name: string | null;
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  streakCount: number;
  lastActiveDate: string | null;
  preferredCategories: string[];
  createdAt: string;
}

export interface DashboardModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  isPremium: boolean;
  isDraft: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  edges: any[];
  _count: { questions: number };
}

export interface DashboardPayment {
  id: string;
  userId: string;
  lsOrderId: string;
  amount: number;
  currency: string;
  status: string;
  planType: string;
  createdAt: string;
  user?: { id: string; email: string; name: string | null };
}

interface DashboardStatsData {
  users: DashboardUser[];
  modules: { data: DashboardModule[]; pagination?: { total: number } };
  payments: DashboardPayment[];
}

interface ModuleListData {
  modules: DashboardModule[];
  total: number;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: { modules: number };
  modules?: { id: string; title: string; slug: string }[];
}

export function useDashboardStats() {
  return useQuery<DashboardStatsData>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [usersRes, modulesRes, paymentsRes] = await Promise.all([
        api.get("/auth/users"),
        api.get("/modules?limit=100&admin=true"),
        api.get("/payments/history?all=true"),
      ]);
      return {
        users: usersRes.data,
        modules: modulesRes.data,
        payments: Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data.data || [],
      };
    },
  });
}

export function useUsers() {
  return useQuery<DashboardUser[]>({
    queryKey: ["admin", "users-list"],
    queryFn: async () => {
      const { data } = await api.get("/auth/users");
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useModules(limit: number = 10) {
  return useQuery<ModuleListData>({
    queryKey: ["admin", "modules", limit],
    queryFn: async () => {
      const { data } = await api.get(`/modules?limit=${limit}&admin=true`);
      return {
        modules: data.data || [],
        total: data.pagination?.total ?? (data.data?.length || 0),
      };
    },
  });
}

export function useAllModules() {
  return useQuery<ModuleListData>({
    queryKey: ["admin", "modules", "all"],
    queryFn: async () => {
      const { data } = await api.get("/modules?limit=1000&admin=true");
      return {
        modules: data.data || [],
        total: data.pagination?.total ?? (data.data?.length || 0),
      };
    },
  });
}

export function useModule(slug: string) {
  return useQuery<DashboardModule>({
    queryKey: ["admin", "module", slug],
    queryFn: async () => {
      const { data } = await api.get(`/modules/${slug}?admin=true`);
      return data as DashboardModule;
    },
    enabled: !!slug,
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data } = await api.get("/payments/history?all=true");
      return Array.isArray(data) ? data : data.data || [];
    },
  });
}

export function useCategories() {
  return useQuery<CategoryData[]>({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories/admin/list");
      return (data.data || []) as CategoryData[];
    },
  });
}

export function useCategory(id: string) {
  return useQuery<CategoryData>({
    queryKey: ["admin", "category", id],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${id}`);
      return data as CategoryData;
    },
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; slug: string; description?: string; sortOrder?: number }) => {
      const { data: result } = await api.post("/categories", data);
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; slug?: string; description?: string; sortOrder?: number } }) => {
      const { data: result } = await api.patch(`/categories/${id}`, data);
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}
