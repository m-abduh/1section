import { api } from "@/lib/axios";
import type { FavoriteItem } from "@/lib/types";

export const favoritesApi = {
  list: () =>
    api.get<FavoriteItem[]>("/favorites").then(r => r.data),

  add: (slug: string) =>
    api.post<{ id: string }>(`/favorites/${slug}`).then(r => r.data),

  remove: (slug: string) =>
    api.delete<{ deleted: boolean }>(`/favorites/${slug}`).then(r => r.data),

  check: (slug: string) =>
    api.get<{ isFavorited: boolean }>(`/favorites/${slug}/check`).then(r => r.data),
};
