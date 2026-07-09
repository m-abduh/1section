import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

interface DashboardUser {
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

interface DashboardModule {
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

interface DashboardPayment {
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

interface CategoryData {
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
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data } = await api.get("/auth/users");
      return data;
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
    staleTime: 0,
    refetchOnMount: true,
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
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useModule(slug: string) {
  return useQuery({
    queryKey: ["admin", "module", slug],
    queryFn: async () => {
      const { data } = await api.get(`/modules/${slug}?admin=true`);
      return data;
    },
    enabled: !!slug,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useTogglePremium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, isPremium }: { slug: string; isPremium: boolean }) => {
      const { data } = await api.patch(`/modules/${slug}`, { isPremium });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "modules"] }),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string) => {
      await api.delete(`/modules/${slug}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "modules"] }),
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

export function useQuizStats() {
  return useQuery({
    queryKey: ["admin", "quiz"],
    queryFn: async () => {
      const { data } = await api.get("/modules?limit=100&admin=true");
      return data.data || [];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories/admin/list");
      return data.data || [];
    },
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ["admin", "category", id],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${id}`);
      return data;
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
