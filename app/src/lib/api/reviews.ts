import { api } from "@/lib/axios";

export interface ReviewResponse {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export const reviewsApi = {
  create: (data: { moduleSlug?: string; rating: number; comment?: string }) =>
    api.post<ReviewResponse>("/reviews", data).then(r => r.data),
};
