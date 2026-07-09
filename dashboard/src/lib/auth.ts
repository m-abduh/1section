import { create } from "zustand";
import api from "./api";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    set({ user: data.user, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    set({ user: null });
  },

  checkAuth: async () => {
    try {
      const { data } = await api.get("/auth/me");
      if (data.role !== "ADMIN") {
        set({ user: null, isLoading: false });
        window.location.href = "/login";
        return;
      }
      set({ user: data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
