import { api } from "@/lib/axios";
import type { ActionPlan, MatrixRow } from "@/lib/types";

export const actionsApi = {
  list: () =>
    api.get<ActionPlan[]>("/actions").then(r => r.data),

  getByModule: (moduleId: string) =>
    api.get<ActionPlan | null>(`/actions/module/${moduleId}`).then(r => r.data),

  getById: (id: string) =>
    api.get<ActionPlan>(`/actions/${id}`).then(r => r.data),

  create: (body: { moduleSlug: string; title: string; content: MatrixRow[] }) =>
    api.post<ActionPlan>("/actions", body).then(r => r.data),

  update: (id: string, body: { title?: string; content?: MatrixRow[]; completed?: boolean }) =>
    api.patch<ActionPlan>(`/actions/${id}`, body).then(r => r.data),

  remove: (id: string) =>
    api.delete<{ deleted: boolean }>(`/actions/${id}`).then(r => r.data),
};
