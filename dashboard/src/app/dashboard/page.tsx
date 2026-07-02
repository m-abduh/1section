"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Users,
  CreditCard,
  ArrowUpRight,
  DollarSign,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  LineChart, Line,
} from "recharts";
import Link from "next/link";
import api from "@/lib/api";
import StatCard from "@/components/StatCard";
import { useAllModules } from "@/hooks/useAdmin";

const fmt = (n: number) => n.toLocaleString("en-US");
const currency = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

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

export default function DashboardPage() {
  const { data: modulesData } = useAllModules();
  const modules = modulesData?.modules || [];
  const totalModules = modulesData?.total ?? modules.length;

  const { data: payments } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data } = await api.get("/payments/history?all=true");
      return Array.isArray(data) ? data : data.data || [];
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ["admin", "users-list"],
    queryFn: async () => {
      const { data } = await api.get("/auth/users");
      return Array.isArray(data) ? data : [];
    },
  });

  const totalUsers = allUsers?.length || 0;
  const premiumUsers = allUsers?.filter(
    (u: any) => u.subscriptionStatus && u.subscriptionStatus !== "FREE"
  ) || [];

  const succeededPayments = payments?.filter((p: any) => p.status === "SUCCEEDED") || [];
  const totalRevenue = succeededPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalSessions = payments?.length || 0;

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthRevenue = succeededPayments
    .filter((p: any) => {
      const d = new Date(p.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const [userGrowthDays, setUserGrowthDays] = useState(7);

  const userGrowthData = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];
    const sorted = [...allUsers].sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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

  const moduleCatData = modules
    ? Object.entries(
        modules.reduce((acc: any, m: any) => {
          const cat = m.category || "uncategorized";
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
        .sort((a, b) => (b.count as number) - (a.count as number))
    : [];

  const recentPayments = (payments as any[])?.slice(0, 8) || [];

  const { data: feedback } = useQuery({
    queryKey: ["admin", "feedback"],
    queryFn: async () => {
      const { data } = await api.get("/reviews?all=true");
      return Array.isArray(data) ? data : [];
    },
  });

  const recentFeedback = (feedback as any[])
    ?.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5) || [];

  const growthChartRef = useRef<HTMLDivElement>(null);
  const [growthDims, setGrowthDims] = useState({ width: 0, height: 240 });
  useEffect(() => {
    const el = growthChartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setGrowthDims(w => w.width !== width ? { width, height: height || 240 } : w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const catChartRef = useRef<HTMLDivElement>(null);
  const [catDims, setCatDims] = useState({ width: 0, height: 240 });
  useEffect(() => {
    const el = catChartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setCatDims(w => w.width !== width ? { width, height: height || 240 } : w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl max-sm:text-2xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">
            Real-time overview of your platform metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400 tracking-wide">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Modules"
          value={fmt(totalModules)}
          icon={BookOpen}
          color="#a78bfa"
          accent="#a78bfa"
        />
        <StatCard
          title="Active Users"
          value={fmt(totalUsers)}
          icon={Users}
          color="#38bdf8"
          accent="#38bdf8"
        />
        <StatCard
          title="Premium Users"
          value={fmt(premiumUsers.length)}
          icon={Sparkles}
          color="#f59e0b"
          accent="#f59e0b"
        />
        <StatCard
          title="Total Revenue"
          value={currency(totalRevenue)}
          icon={DollarSign}
          color="#34d399"
          accent="#34d399"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-white">User Growth</h3>
              <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
                <button onClick={() => setUserGrowthDays(7)} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${userGrowthDays === 7 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>7 days</button>
                <button onClick={() => setUserGrowthDays(30)} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${userGrowthDays === 30 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>30 days</button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <span className="text-white/40">Premium</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-white/40">Free Users</span>
              </div>
            </div>
          </div>
            <div ref={growthChartRef} className="h-[240px] max-sm:h-[200px]">
              {userGrowthData.length > 0 && growthDims.width > 0 && (
                <LineChart width={growthDims.width} height={growthDims.height} data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(17,17,17,0.95)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                    labelFormatter={(label: any) => {
                      const d = new Date(label);
                      return isNaN(d.getTime()) ? label : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="free"
                    name="Free Users"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "rgba(255,255,255,0.5)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="premium"
                    name="Premium"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#f59e0b" }}
                  />
                </LineChart>
              )}
              {userGrowthData.length === 0 && (
                <div className="h-full flex items-center justify-center text-white/20 text-sm">No data</div>
              )}
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-white">Modules by Category</h3>
                <p className="text-xs text-white/30 mt-0.5">{fmt(modules?.length || 0)} total modules</p>
              </div>
            </div>
             <div ref={catChartRef} className="h-[240px] max-sm:h-[200px]">
              {moduleCatData.length > 0 && catDims.width > 0 && (
                  <BarChart width={catDims.width} height={catDims.height} data={moduleCatData} layout="vertical" barCategoryGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17,17,17,0.95)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: "13px",
                      }}
                    />
                     <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {moduleCatData.map((_: any, i: number) => (
                          <Cell
                            key={i}
                            fill={i === 0 ? "#f59e0b" : `rgba(255, 255, 255, ${Math.max(0.08, 0.18 - i * 0.03)})`}
                          />
                        ))}
                      </Bar>
                  </BarChart>
              )}
              {moduleCatData.length === 0 && (
                <div className="h-full flex items-center justify-center text-white/20 text-sm">No data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 lg:col-span-2 overflow-hidden">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">Recent Payments</h3>
                <p className="text-xs text-white/30 mt-0.5">Last {recentPayments.length} transactions</p>
              </div>
              <Link
                href="/dashboard/payments"
                className="flex items-center gap-1 text-xs font-semibold text-white/40 hover:text-white transition-colors"
              >
                View all <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] font-bold text-white/25 uppercase tracking-widest px-3 py-3">User</th>
                    <th className="text-right text-[10px] font-bold text-white/25 uppercase tracking-widest px-3 py-3">Amount</th>
                    <th className="text-left text-[10px] font-bold text-white/25 uppercase tracking-widest px-3 py-3">Plan</th>
                    <th className="text-left text-[10px] font-bold text-white/25 uppercase tracking-widest px-3 py-3">Status</th>
                    <th className="text-right text-[10px] font-bold text-white/25 uppercase tracking-widest px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center text-white/20 text-sm">No payments yet</td>
                    </tr>
                  ) : (
                    recentPayments.map((p: any, i: number) => (
                      <tr
                        key={p.id || i}
                        className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-bold text-white/30">
                              {(p.user?.name || p.user?.email || "?")?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white/80">{p.user?.name || "—"}</div>
                              <div className="text-xs text-white/25">{p.user?.email || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right text-sm font-bold text-white tabular-nums">
                          ${(p.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs text-white/40 font-medium">{p.planType}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide ${
                              p.status === "SUCCEEDED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : p.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-400"
                                : p.status === "REFUNDED"
                                ? "bg-sky-500/10 text-sky-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right text-sm text-white/30 tabular-nums">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">Recent Feedback</h3>
                <p className="text-xs text-white/30 mt-0.5">Last {recentFeedback.length} reviews</p>
              </div>
              <Link
                href="/dashboard/feedback"
                className="flex items-center gap-1 text-xs font-semibold text-white/40 hover:text-white transition-colors"
              >
                View all <ArrowUpRight size={13} />
              </Link>
            </div>

            {recentFeedback.length === 0 ? (
              <div className="py-12 text-center text-white/20 text-sm">
                No feedback yet
              </div>
            ) : (
              <div className="space-y-4">
                {recentFeedback.map((f: any, i: number) => (
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
      </div>
    </div>
  );
}
