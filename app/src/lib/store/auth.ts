import { create } from "zustand";
import { authApi } from "@/lib/api/auth";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  preferences: string[];
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, confirmPassword?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setPreferences: (categories: string[]) => Promise<void>;
  loadPreferences: () => Promise<void>;
  validateToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  (set, get) => ({
    user: null,
    loading: true,
    preferences: [],

    validateToken: async () => {
      try {
        const me = await authApi.getMe();
        set({ user: me, loading: false });
        if (me.preferredCategories) set({ preferences: me.preferredCategories });
      } catch {
        set({ user: null, loading: false });
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
      set({ user: res.user });
      if (res.user.preferredCategories) set({ preferences: res.user.preferredCategories });
    },

    register: async (email: string, password: string, name?: string, confirmPassword?: string) => {
      if (confirmPassword && password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const res = await authApi.register({ email, password, confirmPassword: confirmPassword || password, name });
      set({ user: res.user });
    },

    loginWithGoogle: async (credential: string) => {
      let profile: { idToken?: string };
      try {
        profile = JSON.parse(credential);
      } catch {
        throw new Error("Invalid Google credential format");
      }
      if (!profile.idToken || typeof profile.idToken !== "string") {
        throw new Error("Missing idToken in Google credential");
      }
      const res = await authApi.googleAuth({ idToken: profile.idToken });
      set({ user: res.user });
    },

    logout: async () => {
      try {
        await authApi.logout();
      } catch {
        // ignore server error on logout
      }
      set({ user: null, preferences: [] });
    },

    setUser: (user: User | null) => set({ user }),
  }),
);
