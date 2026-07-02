"use client";

import { useQuery } from "@tanstack/react-query";
import { Star, User } from "lucide-react";
import api from "@/lib/api";
import DataTable from "@/components/DataTable";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= rating ? "text-amber-400 fill-amber-400" : "text-white/10"}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin", "feedback"],
    queryFn: async () => {
      const { data } = await api.get("/reviews?all=true");
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 10_000,
  });

  const total = (reviews as any[])?.length || 0;
  const avgRating = total > 0
    ? ((reviews as any[]).reduce((s: number, r: any) => s + r.rating, 0) / total).toFixed(1)
    : "—";

  const ratingDist = [0, 0, 0, 0, 0];
  (reviews as any[] || []).forEach((r: any) => {
    if (r.rating >= 1 && r.rating <= 5) ratingDist[5 - r.rating]++;
  });

  const columns = [
    {
      key: "user",
      label: "User",
      sortable: true,
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <User size={14} className="text-white/30" />
          </div>
          <div>
            <div className="text-white font-medium text-sm">{r.user?.name || "—"}</div>
            <div className="text-[#555] text-xs">{r.user?.email || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "module",
      label: "Module",
      sortable: true,
      render: (r: any) => (
        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/5 text-white/40">
          {r.module?.title || "No module"}
        </span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (r: any) => <Stars rating={r.rating} />,
    },
    {
      key: "comment",
      label: "Comment",
      sortable: false,
      render: (r: any) => (
        <span className="text-[#888] text-sm">
          {r.comment || "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (r: any) => (
        <span className="text-[#555] text-sm">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Feedback</h2>
        <p className="text-sm text-white/40 mt-1">User reviews and ratings across all modules.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
          <div className="text-3xl font-extrabold text-white">{total}</div>
          <div className="text-xs text-white/40 mt-1 font-medium">Total Reviews</div>
        </div>
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-extrabold text-white">{avgRating}</div>
            <Stars rating={Math.round(Number(avgRating))} />
          </div>
          <div className="text-xs text-white/40 mt-1 font-medium">Average Rating</div>
        </div>
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 col-span-2">
          <div className="text-xs text-white/40 font-medium mb-2">Rating Distribution</div>
          <div className="space-y-1">
            {ratingDist.map((count, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-3 text-white/30 font-mono">{5 - i}</span>
                <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400/60 rounded-full transition-all"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-right text-white/30 font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={reviews || []}
        searchKeys={["comment", "user.name", "user.email", "module.title"]}
      />
    </div>
  );
}
