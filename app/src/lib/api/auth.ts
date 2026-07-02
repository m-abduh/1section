import { api } from "@/lib/axios";
import type { AuthResponse, User } from "@/lib/types";

export const authApi = {
  register: (body: { email: string; password: string; name?: string }) =>
    api.post<AuthResponse>("/auth/register", body).then(r => r.data),

  login: (body: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", body).then(r => r.data),

  googleAuth: (body: { googleId: string; email: string; name?: string; avatar?: string }) =>
    api.post<AuthResponse>("/auth/google", body).then(r => r.data),

  getMe: () => api.get<User>("/auth/me").then(r => r.data),

  updateProfile: (body: { name?: string; avatar?: string }) =>
    api.put<User>("/auth/profile", body).then(r => r.data),

  getPreferences: () =>
    api.get<{ preferredCategories: string[] }>("/auth/preferences").then(r => r.data),

  updatePreferences: (body: { preferredCategories: string[] }) =>
    api.put<{ preferredCategories: string[] }>("/auth/preferences", body).then(r => r.data),
};
