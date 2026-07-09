"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAllModules } from "@/hooks/useAdmin";
import type { DashboardUser, DashboardPayment } from "@/hooks/useAdmin";
import { unwrapResponse } from "@/lib/utils";
import DashboardStatsCards from "@/components/DashboardStatsCards";
import UserGrowthChart from "@/components/UserGrowthChart";
import CategoryBarChart from "@/components/CategoryBarChart";
import RecentPaymentsTable from "@/components/RecentPaymentsTable";
import RecentFeedbackList from "@/components/RecentFeedbackList";

interface FeedbackItem {
  id?: string;
  user?: { name?: string };
  module?: { title?: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: modulesData } = useAllModules();
  const modules = modulesData?.modules || [];
  const totalModules = modulesData?.total ?? modules.length;

  const { data: payments } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data } = await api.get("/payments/history?all=true");
      return unwrapResponse(data) as DashboardPayment[];
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ["admin", "users-list"],
    queryFn: async () => {
      const { data } = await api.get("/auth/users");
      return (Array.isArray(data) ? data : []) as DashboardUser[];
    },
  });

  const totalUsers = allUsers?.length || 0;
  const premiumUsers = allUsers?.filter(
    (u) => u.subscriptionStatus && u.subscriptionStatus !== "FREE"
  ) || [];

  const succeededPayments = payments?.filter((p) => p.status === "SUCCEEDED") || [];
  const totalRevenue = succeededPayments.reduce((sum, p) => sum + p.amount, 0);

  const [userGrowthDays, setUserGrowthDays] = useState(7);

  const userGrowthData = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];
    const sorted = [...allUsers].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const days: Record<string, { total: number; premium: number }> = {};
    const dateKeys: string[] = [];
    for (let i = userGrowthDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { total: 0, premium: 0 };
      dateKeys.push(key);
    }
    let runningTotal = 0;
    let runningPremium = 0;
    let idx = 0;
    for (const key of dateKeys) {
      const cutoff = new Date(key + "T23:59:59.999Z");
      while (idx < sorted.length && new Date(sorted[idx].createdAt) <= cutoff) {
        runningTotal++;
        if (sorted[idx].subscriptionStatus && sorted[idx].subscriptionStatus !== "FREE") {
          runningPremium++;
        }
        idx++;
      }
      days[key] = { total: runningTotal, premium: runningPremium };
    }
    return dateKeys.map((date) => ({
      date,
      free: days[date].total - days[date].premium,
      premium: days[date].premium,
    }));
  }, [allUsers, userGrowthDays]);

  type ModuleCategoryAcc = Record<string, number>;
  const moduleCatData = modules
    ? Object.entries(
        modules.reduce<ModuleCategoryAcc>((acc, m) => {
          const cat = m.category || "uncategorized";
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const recentPayments = payments?.slice(0, 8) || [];

  const { data: feedback } = useQuery({
    queryKey: ["admin", "feedback"],
    queryFn: async () => {
      const { data } = await api.get("/reviews?all=true");
      return (Array.isArray(data) ? data : []) as FeedbackItem[];
    },
  });

  const recentFeedback = feedback
    ? [...feedback].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl max-sm:text-2xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">Real-time overview of your platform metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400 tracking-wide">LIVE</span>
        </div>
      </div>

      <DashboardStatsCards
        totalModules={totalModules}
        totalUsers={totalUsers}
        premiumUsers={premiumUsers.length}
        totalRevenue={totalRevenue}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart data={userGrowthData} days={userGrowthDays} onDaysChange={setUserGrowthDays} />
        <CategoryBarChart data={moduleCatData} totalModules={modules?.length || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentPaymentsTable payments={recentPayments} />
        <RecentFeedbackList feedback={recentFeedback} />
      </div>
    </div>
  );
}
