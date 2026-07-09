"use client";

import { ArrowUpRight, Star, User } from "lucide-react";
import Link from "next/link";

interface Feedback {
  id?: string;
  user?: { name?: string };
  module?: { title?: string };
  rating?: number;
  comment?: string;
  createdAt?: string;
}

interface RecentFeedbackListProps {
  feedback: Feedback[];
}

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

export default function RecentFeedbackList({ feedback }: RecentFeedbackListProps) {
  return (
    <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Feedback</h3>
            <p className="text-xs text-white/30 mt-0.5">Last {feedback.length} reviews</p>
          </div>
          <Link
            href="/dashboard/feedback"
            className="flex items-center gap-1 text-xs font-semibold text-white/40 hover:text-white transition-colors"
          >
            View all <ArrowUpRight size={13} />
          </Link>
        </div>
        {feedback.length === 0 ? (
          <div className="py-12 text-center text-white/20 text-sm">No feedback yet</div>
        ) : (
          <div className="space-y-4">
            {feedback.map((f: Feedback, i: number) => (
              <div key={f.id || i} className="bg-white/[0.03] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <User size={14} className="text-white/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {f.user?.name || "—"}
                      </span>
                      <Stars rating={f.rating || 0} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-white/40 truncate">
                        {f.module?.title || "No module"}
                      </span>
                      <span className="text-[10px] text-white/25 shrink-0 tabular-nums">
                        {f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                      </span>
                    </div>
                    {f.comment && (
                      <p className="text-xs text-white/35 mt-2 line-clamp-2">
                        {f.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
