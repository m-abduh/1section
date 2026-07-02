import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/auth";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  preferences: string[];
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setPreferences: (categories: string[]) => Promise<void>;
  loadPreferences: () => Promise<void>;
  validateToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: true,
      preferences: [],

      validateToken: async () => {
        const token = get().token;
        if (!token) {
          set({ loading: false });
          return;
        }
        try {
          const me = await authApi.getMe();
          set({ user: me, loading: false });
          if (me.preferredCategories) set({ preferences: me.preferredCategories });
        } catch {
          localStorage.removeItem("token");
          set({ user: null, token: null, loading: false });
        }
      },

      loadPreferences: async () => {
        try {
          const res = await authApi.getPreferences();
          set({ preferences: res.preferredCategories });
        } catch {
          // ignore
        }
      },

      setPreferences: async (categories: string[]) => {
        const res = await authApi.updatePreferences({ preferredCategories: categories });
        set({ preferences: res.preferredCategories });
        const u = get().user;
        if (u) set({ user: { ...u, preferredCategories: res.preferredCategories } });
      },

      login: async (email: string, password: string) => {
        const res = await authApi.login({ email, password });
        localStorage.setItem("token", res.token);
        set({ user: res.user, token: res.token });
        if (res.user.preferredCategories) set({ preferences: res.user.preferredCategories });
      },

      register: async (email: string, password: string, name?: string) => {
        const res = await authApi.register({ email, password, name });
        localStorage.setItem("token", res.token);
        set({ user: res.user, token: res.token });
      },

      loginWithGoogle: async (profileJson: string) => {
        const profile = JSON.parse(profileJson);
        const res = await authApi.googleAuth({
          googleId: profile.sub,
          email: profile.email,
          name: profile.name,
          avatar: profile.picture,
        });
        localStorage.setItem("token", res.token);
        set({ user: res.user, token: res.token });
      },

      logout: () => {
        localStorage.removeItem("token");
        set({ user: null, token: null, preferences: [] });
      },

      setUser: (user: User | null) => set({ user }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
