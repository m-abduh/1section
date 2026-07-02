import { create } from "zustand";
import api from "./api";

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    const token = data.token;
    localStorage.setItem("admin_token", token);
    set({ user: data.user, token, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("admin_token");
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, token, isLoading: false });
    } catch {
      localStorage.removeItem("admin_token");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
