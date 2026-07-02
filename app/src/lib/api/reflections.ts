import { api } from "@/lib/axios";
import type { Reflection } from "@/lib/types";

export const reflectionsApi = {
  list: () =>
    api.get<Reflection[]>("/reflections").then(r => r.data),

  getById: (id: string) =>
    api.get<Reflection>(`/reflections/${id}`).then(r => r.data),

  create: (body: { title: string; content: string; moduleSlug: string }) =>
    api.post<Reflection>("/reflections", body).then(r => r.data),

  update: (id: string, body: { title?: string; content?: string }) =>
    api.put<Reflection>(`/reflections/${id}`, body).then(r => r.data),

  remove: (id: string) =>
    api.delete<{ deleted: boolean }>(`/reflections/${id}`).then(r => r.data),
};
