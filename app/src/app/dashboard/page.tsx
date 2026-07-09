"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import {
  Flame,
  Play,
  BookOpen,
  Headphones,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Crown,
  HelpCircle,
  FileText,
} from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { paymentsApi } from "@/lib/api/payments";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useDashboardStats, useStreak, useResetStreak, useQuizStats } from "@/lib/query-hooks";

export default function DashboardPage() {
  const { user, setUser } = useAuth();
  const [greeting, setGreeting] = useState("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);

  const { data: stats } = useDashboardStats();
  const { data: streakData } = useStreak();
  const resetStreak = useResetStreak();
  const { data: quizStats } = useQuizStats();

  const streak = streakData?.streak ?? 0;
  const showStreakPopup = streakData?.showPopup ?? false;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const handleStreakPopupOk = useCallback(async () => {
    await resetStreak.mutateAsync();
  }, [resetStreak]);

  // Payment verification handled via /payment/success page

  const todayQuote = "Action is the foundational key to all success.";

  const categoryColors: Record<string, string> = {
    mindset: '#a78bfa', clarity: '#fb923c', habit: '#fbbf24', productivity: '#34d399',
    focus: '#60a5fa', learning: '#f472b6', creativity: '#fb7185', strategy: '#818cf8',
    wellbeing: '#4ade80', 'mental-model': '#8b5cf6', logic: '#06b6d4', psychology: '#ec4899',
    success: '#10b981', stoicism: '#78716c', 'cognitive-bias': '#f59e0b', 'decision-making': '#6366f1',
    business: '#0ea5e9', 'problem-solving': '#14b8a6', 'game-theory': '#f43f5e', resilience: '#22c55e',
    risk: '#ef4444', economics: '#eab308',
  };

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16 text-center">
        <h1 className="text-3xl font-black mb-4">Sign in to view your dashboard</h1>
        <Link href="/login" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-semibold">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16">
      <header className="mb-10">
        <div className="mb-2">
          <span className="text-[0.875rem] text-muted-dark uppercase tracking-[0.1em]">{greeting}</span>
        </div>
        <h1 className="text-4xl font-black tracking-[-0.02em] mb-2">Ready to Think,</h1>
        <p className="text-lg text-muted-light">{todayQuote}</p>
      </header>

      {paymentVerified && (
        <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
          <Crown size={18} className="text-emerald-500 flex-shrink-0" />
          <p className="text-[0.875rem] text-emerald-300 font-semibold">
            Subscription activated! You now have full access.
          </p>
        </div>
      )}

      {verifyingPayment && (
        <div className="mb-8 p-4 bg-premium/10 border border-premium/20 rounded-xl flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-premium/30 border-t-premium rounded-full animate-spin" />
          <p className="text-[0.875rem] text-premium">Activating your subscription...</p>
        </div>
      )}



      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-bg-card rounded-2xl p-5 border border-border-subtle flex-1 min-w-0">
          <div className="flex items-center gap-2 text-muted mb-3">
            <CheckCircle2 size={14} />
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.08em]">Completed</span>
          </div>
          <p className="text-2xl font-black text-fg">{stats?.completedModules || 0}<span className="text-[0.875rem] font-normal text-muted-dark ml-1">/ {stats?.totalModules || 0}</span><span className="text-[0.875rem] text-[#a78bfa] ml-2">+{stats?.completedXp || 0} XP</span></p>
          <p className="text-[0.6875rem] text-muted-dark mt-1">Modules finished</p>
        </div>
        <div className="bg-bg-card rounded-2xl p-5 border border-border-subtle flex-1 min-w-0">
          <div className="flex items-center gap-2 text-muted mb-3">
            <BookOpen size={14} />
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.08em]">Read</span>
          </div>
          <p className="text-2xl font-black text-fg">{stats?.readingMinutes || 0}<span className="text-[0.875rem] font-normal text-muted-dark ml-1">min</span><span className="text-[0.875rem] text-[#a78bfa] ml-2">+{stats?.readXp || 0} XP</span></p>
          <p className="text-[0.6875rem] text-muted-dark mt-1">Total reading time</p>
        </div>
        <div className="bg-bg-card rounded-2xl p-5 border border-border-subtle flex-1 min-w-0">
          <div className="flex items-center gap-2 text-muted mb-3">
            <Headphones size={14} />
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.08em]">Listened</span>
          </div>
          <p className="text-2xl font-black text-fg">{stats?.listeningMinutes || 0}<span className="text-[0.875rem] font-normal text-muted-dark ml-1">min</span><span className="text-[0.875rem] text-[#a78bfa] ml-2">+{stats?.listenXp || 0} XP</span></p>
          <p className="text-[0.6875rem] text-muted-dark mt-1">Total audio time</p>
        </div>
        <div className="bg-bg-card rounded-2xl p-5 border border-border-subtle flex-1 min-w-0">
          <div className="flex items-center gap-2 text-muted mb-3">
            <FileText size={14} />
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.08em]">Notebook</span>
          </div>
          <p className="text-2xl font-black text-fg">{stats?.notebookCount || 0}<span className="text-[0.875rem] font-normal text-muted-dark ml-1">notes</span><span className="text-[0.875rem] text-[#a78bfa] ml-2">+{stats?.notebookXp || 0} XP</span></p>
          <p className="text-[0.6875rem] text-muted-dark mt-1">Slide notes saved</p>
        </div>
        <div className="bg-bg-card rounded-2xl p-5 border border-border-subtle flex-1 min-w-0">
          <div className="flex items-center gap-2 text-muted mb-3">
            <HelpCircle size={14} />
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.08em]">Quizzes</span>
          </div>
          <p className="text-2xl font-black text-fg">{quizStats?.totalQuizzesTaken || 0}<span className="text-[0.875rem] font-normal text-muted-dark ml-1">taken</span><span className="text-[0.875rem] text-[#a78bfa] ml-2">+{quizStats?.quizXp || 0} XP</span></p>
          <p className="text-[0.6875rem] text-muted-dark mt-1">{quizStats?.totalQuizzesTaken ? `${quizStats.totalCorrect}/${quizStats.totalAnswered} correct (${Math.round(quizStats.averagePercentage)}%)` : 'No quizzes yet'}</p>
        </div>
        <div className="bg-bg-card rounded-2xl p-5 border border-border-subtle flex-1 min-w-0">
          <div className="flex items-center gap-2 text-muted mb-3">
            <Sparkles size={14} />
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.08em]">Reflections</span>
          </div>
          <p className="text-2xl font-black text-fg">{stats?.reflectionCount || 0}<span className="text-[0.875rem] text-[#a78bfa] ml-2">+{stats?.reflectionXp || 0} XP</span></p>
          <p className="text-[0.6875rem] text-muted-dark mt-1">Total reflections</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-bg rounded-xl border border-border-subtle overflow-hidden relative px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 relative z-10 shrink-0">
            <Flame size={14} className="text-[#f97316]" />
            <span className="text-[0.75rem] font-bold text-muted">{streak} day streak</span>
          </div>
          <div className="flex-1 mx-6 relative z-10">
            <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#f97316] to-[#fb923c] rounded-full transition-all" style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="relative z-10 shrink-0">
            <span className="text-[0.6875rem] text-muted-dark font-bold">30 day goal</span>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#f97316]/5 to-transparent rounded-full translate-x-1/4 -translate-y-1/4" />
        </div>
      </div>

      {showStreakPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <Flame size={48} className="text-[#f97316] mx-auto mb-4" />
            <h2 className="text-xl font-black text-fg mb-2">Streak Broken!</h2>
            <p className="text-[0.875rem] text-muted-light mb-6">
              You missed a day and lost your <span className="text-fg font-bold">{streak}-day</span> streak.
              <br />Start again today to build a new streak!
            </p>
            <button
              onClick={handleStreakPopupOk}
              className="bg-fg text-bg px-8 py-3 rounded-xl font-bold text-[0.875rem] hover:opacity-90 transition-colors"
            >
              OK, I&apos;ll Start Again
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bg-card rounded-2xl p-6 border border-border-subtle">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[0.875rem] text-muted-dark uppercase font-bold tracking-[0.05em]">Current Rank</h3>
                <span className="text-[0.75rem] text-muted-light">{stats?.totalXp?.toLocaleString() || 0} XP</span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] flex items-center justify-center text-lg font-bold">{stats?.rank?.charAt(0) || "B"}</div>
                <div>
                  <div className="font-semibold text-lg text-fg">{stats?.rank || "Beginner"}</div>
                  <div className="text-[0.75rem] text-muted-light">Level {stats?.rankLevel || 1}</div>
                </div>
              </div>
              <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] rounded-full" style={{ width: `${stats ? ((stats.totalXp - stats.prevLevelXp) / (stats.nextLevelXp - stats.prevLevelXp)) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[0.6875rem] text-muted-light">
                <span>{stats?.prevLevelXp?.toLocaleString() || 0} XP</span>
                <span>Next: {stats?.nextRank || "—"} ({stats?.nextLevelXp?.toLocaleString() || 0} XP)</span>
              </div>
            </div>

            <div className="bg-bg-card rounded-2xl p-6 border border-border-subtle">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[0.875rem] text-muted-dark uppercase font-bold tracking-[0.05em]">Weekly Insights</h3>
                <Flame size={16} className="text-[#f97316]" />
              </div>
              <div className="flex items-center justify-between gap-1.5 mb-5">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                  const now = new Date();
                  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                  const dayOfWeek = (now.getDay() + 6) % 7;
                  const targetDate = new Date(now);
                  targetDate.setDate(now.getDate() - ((dayOfWeek - weekDays.indexOf(day) + 7) % 7));
                  const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
                  const hasReflection = stats?.weeklyReflectionDates?.includes(dateStr) ?? false;
                  return (
                    <div key={day} className="flex flex-col items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${hasReflection ? 'bg-[#f97316] text-black' : 'bg-bg-elevated'}`}>
                        <div className={`w-2 h-2 rounded-full ${hasReflection ? 'bg-black' : 'bg-muted-dark'}`} />
                      </div>
                      <span className="text-[0.625rem] text-muted-dark font-bold">{day.charAt(0)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[0.75rem] text-muted-light">
                <span className="text-xl font-bold text-fg">
                  {stats?.weeklyReflectionDates?.length || 0}
                </span>
                {" "}reflections this week
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[0.875rem] text-muted-dark uppercase font-bold mb-4 tracking-[0.05em]">Recent Activity</h3>
            <div className="flex flex-col gap-2">
              {(stats?.recentActivity || []).length > 0 ? stats?.recentActivity.map((r) => (
                <Link key={r.slug} href={`/models/${r.slug}`} className="group bg-bg-card rounded-xl px-6 py-4 border border-border-subtle no-underline flex items-center gap-4 hover:bg-bg hover:border-border transition-all">
                  <div className="flex flex-col items-center gap-0.5 min-w-[36px]">
                    {r.listened > 0 && <span className="text-[0.5625rem] text-muted-dark font-bold">{Math.round(r.listened)}%</span>}
                    <div className="flex gap-1">
                      {r.listened > 0 && <div className={`w-2 h-4 rounded-sm ${r.listened >= 100 ? 'bg-green-500/60' : 'bg-fg/30'}`} style={{ opacity: r.listened / 100 }} />}
                      {r.read > 0 && <div className={`w-2 h-4 rounded-sm ${r.read >= 100 ? 'bg-green-500/60' : 'bg-fg/30'}`} style={{ opacity: r.read / 100 }} />}
                    </div>
                    <span className="text-[0.5rem] text-muted-dark mt-0.5">
                      {r.listened > 0 && r.read > 0 ? "L+R" : r.listened > 0 ? "Listen" : "Read"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[0.9375rem] text-fg truncate">{r.title}</div>
                    <div className="text-[0.75rem] text-muted-dark">{timeAgo(new Date(r.lastReadAt).getTime())}</div>
                  </div>
                  <Play size={14} className="text-muted-dark group-hover:text-fg transition-colors shrink-0" />
                </Link>
              )) : (
                <div className="bg-bg-card rounded-xl px-6 py-8 border border-border-subtle text-center">
                  <p className="text-[0.875rem] text-muted-dark">No activity yet. Start learning to see your history here.</p>
                  <Link href="/models" className="inline-flex items-center gap-1.5 mt-3 text-[0.8125rem] text-muted hover:text-fg transition-colors">
                    <Sparkles size={14} /> Explore modules <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-bg-card rounded-2xl p-6 border border-border-subtle">
            <h3 className="text-[0.875rem] text-muted-dark uppercase font-bold tracking-[0.05em] mb-6">Library Breakdown</h3>
            {(stats?.completedCategoryBreakdown || []).length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats?.completedCategoryBreakdown || []} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive={false}>
                      {(stats?.completedCategoryBreakdown || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#555'} />
                      ))}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return <div className="bg-bg-elevated border border-border rounded-xl px-4 py-2.5 shadow-xl pointer-events-none"><p className="text-[0.75rem] font-bold text-fg capitalize">{data.name}</p><p className="text-[0.6875rem] text-muted">{data.value} models</p></div>;
                      }
                      return null;
                    }} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {(stats?.completedCategoryBreakdown || []).slice(0, 8).map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2 text-[0.6875rem] text-muted-dark">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: categoryColors[cat.name] || '#555' }} />
                      <span className="capitalize truncate">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[0.875rem] text-muted-dark text-center py-8">Complete modules to see your library breakdown</p>
            )}
          </div>

          <div className="bg-bg-card rounded-2xl p-6 border border-border-subtle">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={14} className="text-premium" />
              <h3 className="text-[0.875rem] text-muted-dark uppercase font-bold tracking-[0.05em]">Recommended</h3>
            </div>
            <div className="flex flex-col gap-3">
              {(stats?.recommendedModules || []).map((m, i) => {
                const colors = ['#a78bfa', '#60a5fa', '#34d399'];
                return (
                  <Link key={m.slug} href={`/models/${m.slug}`} className="group flex items-center gap-3 no-underline hover:bg-bg-elevated rounded-xl px-3 py-2.5 transition-all -mx-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.75rem] font-bold shrink-0" style={{ background: `${colors[i]}15`, color: colors[i] }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.8125rem] font-semibold text-fg truncate">{m.title}</div>
                      <div className="text-[0.6875rem] text-muted-dark truncate">{m.category}</div>
                    </div>
                    <ArrowRight size={12} className="text-muted-dark group-hover:text-fg transition-colors shrink-0" />
                  </Link>
                );
              })}
            </div>
            <Link href="/models" className="block text-center mt-4 text-[0.75rem] text-muted-dark hover:text-fg transition-colors">View all modules →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
