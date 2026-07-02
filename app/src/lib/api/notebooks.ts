import { api } from "@/lib/axios";
import type { NotebookEntry } from "@/lib/types";

export const notebooksApi = {
  list: () =>
    api.get<NotebookEntry[]>("/notebooks").then((r) => r.data),

  getBySlide: (moduleSlug: string, nodeId: string, slideIndex: number) =>
    api
      .get<NotebookEntry | null>(`/notebooks/${moduleSlug}/${nodeId}/${slideIndex}`)
      .then((r) => r.data),

  upsert: (body: {
    moduleSlug: string;
    nodeId: string;
    nodeLabel: string;
    slideIndex: number;
    slideContent: string;
    content: string;
  }) => api.post<NotebookEntry>("/notebooks", body).then((r) => r.data),

  remove: (moduleSlug: string, nodeId: string, slideIndex: number) =>
    api
      .delete<{ deleted: boolean }>(`/notebooks/${moduleSlug}/${nodeId}/${slideIndex}`)
      .then((r) => r.data),
};
