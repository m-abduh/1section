"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Zap,
  Brain,
  Clock,
  Trash2,
  RefreshCw,
  FlaskConical,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface AICategory {
  name: string;
  count: number;
}

interface ExistingTitle {
  title: string;
  slug: string;
  category: string;
}

interface AICategoriesResponse {
  categories: AICategory[];
  existingTitles: ExistingTitle[];
}

interface ScheduleResponse {
  isActive: boolean;
  expression: string;
  createdAt: string;
}

const PRESETS = [
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every 3 hours", cron: "0 */3 * * *" },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Every 12 hours", cron: "0 */12 * * *" },
  { label: "Every day at midnight", cron: "0 0 * * *" },
  { label: "Every day at 6am", cron: "0 6 * * *" },
  { label: "Every Monday", cron: "0 0 * * 1" },
  { label: "Weekdays (Mon-Fri)", cron: "0 0 * * 1-5" },
  { label: "Custom...", cron: "custom" },
];

type CronUnit = "minutes" | "hours" | "days";

function buildCron(interval: number, unit: CronUnit, time?: string): string {
  if (unit === "minutes") {
    if (interval === 1) return "* * * * *";
    if (interval < 60) return `*/${interval} * * * *`;
    const hours = Math.floor(interval / 60);
    if (time) {
      const [h, m] = time.split(":");
      return `${m} ${h} */${hours} * *`;
    }
    return `0 */${hours} * * *`;
  }

  if (unit === "hours") {
    if (time) {
      const [h, m] = time.split(":");
      return `${m} ${h} */${interval} * *`;
    }
    return `0 */${interval} * * *`;
  }

  if (time) {
    const [h, m] = time.split(":");
    return `${m} ${h} */${interval} * *`;
  }
  return `0 0 */${interval} * *`;
}

export default function AutoGeneratePage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [scheduleCategory, setScheduleCategory] = useState<string>("");
  const [frequency, setFrequency] = useState("0 */6 * * *");
  const [customMode, setCustomMode] = useState(false);
  const [intervalVal, setIntervalVal] = useState(6);
  const [intervalUnit, setIntervalUnit] = useState<CronUnit>("hours");
  const [intervalTime, setIntervalTime] = useState("00:00");

  const { data: info, isLoading: infoLoading } = useQuery<AICategoriesResponse>({
    queryKey: ["ai", "categories"],
    queryFn: async () => {
      const { data } = await api.get("/ai/categories");
      return data as AICategoriesResponse;
    },
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery<ScheduleResponse>({
    queryKey: ["ai", "schedule"],
    queryFn: async () => {
      const { data } = await api.get("/ai/schedule");
      return data as ScheduleResponse;
    },
  });

  const [lastError, setLastError] = useState<string | null>(null);

  const generateNow = useMutation({
    mutationFn: async () => {
      setLastError(null);
      const { data } = await api.post("/ai/auto-generate", {
        category: selectedCategory || undefined,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Module created!");
      queryClient.invalidateQueries({ queryKey: ["ai", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] });
    },
    onError: (err: Error) => {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = apiErr.response?.data?.error?.message || "Failed to create module";
      setLastError(msg);
      toast.error(msg, { duration: 6000 });
    },
  });

  const retry = () => {
    generateNow.mutate();
  };

  const saveSchedule = useMutation({
    mutationFn: async (expression: string) => {
      const { data } = await api.post("/ai/schedule", {
        expression,
        category: scheduleCategory || undefined,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Schedule saved!");
      queryClient.invalidateQueries({ queryKey: ["ai", "schedule"] });
      setCustomMode(false);
    },
    onError: (err: Error) => {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(apiErr.response?.data?.error?.message || "Failed to save schedule", { duration: 6000 });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async () => {
      await api.delete("/ai/schedule");
    },
    onSuccess: () => {
      toast.success("Schedule removed");
      queryClient.invalidateQueries({ queryKey: ["ai", "schedule"] });
    },
    onError: (err: Error) => {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = apiErr.response?.data?.error?.message || "Failed to remove schedule";
      toast.error(msg, { duration: 6000 });
    },
  });

  const categories = info?.categories || [];
  const existingTitles = info?.existingTitles || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white">Auto Generate</h2>
        <p className="text-sm text-[#666] mt-1">
          Let AI create modules automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left column: Generate now */}
        <div className="space-y-6">
          {/* Generate Now */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#a855f71a] flex items-center justify-center">
                <Zap size={20} className="text-[#a855f7]" />
              </div>
              <div>
                <h3 className="text-white font-bold">Generate Now</h3>
                <p className="text-xs text-[#666]">Create a module on the spot</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#666] font-medium mb-1.5 block">
                  Category (optional)
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20 appearance-none"
                >
                  <option value="">Auto-detect (fewest modules)</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count} modules)
                    </option>
                  ))}
                </select>
              </div>

              {lastError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <p>{lastError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => generateNow.mutate()}
                  disabled={generateNow.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-[#a855f7] text-white hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {generateNow.isPending ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <FlaskConical size={16} />
                  )}
                  {generateNow.isPending ? "Generating..." : "Generate Module"}
                </button>
                {lastError && !generateNow.isPending && (
                  <button
                    onClick={retry}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white hover:bg-white/20 transition-all"
                    title="Retry"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Categories overview */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#3b82f61a] flex items-center justify-center">
                <Brain size={20} className="text-[#3b82f6]" />
              </div>
              <div>
                <h3 className="text-white font-bold">Categories</h3>
                <p className="text-xs text-[#666]">Module distribution</p>
              </div>
            </div>

            {infoLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02]"
                  >
                    <span className="text-sm text-white capitalize">{cat.name}</span>
                    <span className="text-xs text-[#666]">{cat.count} modules</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Schedule */}
        <div className="space-y-6">
          {/* Schedule */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#34d3991a] flex items-center justify-center">
                <Clock size={20} className="text-[#34d399]" />
              </div>
              <div>
                <h3 className="text-white font-bold">Schedule</h3>
                <p className="text-xs text-[#666]">Automated generation</p>
              </div>
            </div>

            {schedule?.isActive ? (
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#34d399]" />
                  <span className="text-[#34d399] font-medium">Active</span>
                </div>
                <div className="bg-white/[0.02] rounded-xl px-4 py-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666]">Schedule</span>
                    <span className="text-white">
                      {PRESETS.find((f) => f.cron === schedule.expression)?.label || schedule.expression}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666]">Created</span>
                    <span className="text-white text-xs">
                      {new Date(schedule.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => deleteSchedule.mutate()}
                  disabled={deleteSchedule.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={16} />
                  Remove Schedule
                </button>
              </div>
            ) : scheduleLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#555] text-sm">No active schedule</p>
              </div>
            )}

            <div className="border-t border-white/5 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-white">New Schedule</h4>

              <div>
                <label className="text-xs text-[#666] font-medium mb-1.5 block">Frequency</label>
                <select
                  value={customMode ? "custom" : frequency}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "custom") {
                      setCustomMode(true);
                    } else {
                      setCustomMode(false);
                      setFrequency(v);
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20 appearance-none"
                >
                  {PRESETS.map((f) => (
                    <option key={f.cron} value={f.cron}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {customMode && (
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs text-[#555]">Every</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={intervalVal}
                      onChange={(e) => setIntervalVal(Number(e.target.value) || 1)}
                      className="w-20 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20"
                    />
                    <select
                      value={intervalUnit}
                      onChange={(e) => setIntervalUnit(e.target.value as CronUnit)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20 appearance-none"
                    >
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#555] mb-1 block">Starting at (optional)</label>
                    <input
                      type="time"
                      value={intervalTime}
                      onChange={(e) => setIntervalTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-[#666] font-medium mb-1.5 block">
                  Category (optional)
                </label>
                <select
                  value={scheduleCategory}
                  onChange={(e) => setScheduleCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20 appearance-none"
                >
                  <option value="">Auto-detect (fewest modules)</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count} modules)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  const expr = customMode
                    ? buildCron(intervalVal, intervalUnit, intervalTime)
                    : frequency;
                  saveSchedule.mutate(expr);
                }}
                disabled={saveSchedule.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-white text-black hover:opacity-90 transition-all"
              >
                <Clock size={16} />
                {saveSchedule.isPending ? "Saving..." : "Activate Schedule"}
              </button>
            </div>
          </div>

          {/* Recent generated titles (raw) */}
          {existingTitles.length > 0 && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-3">Existing Titles</h3>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {existingTitles.map((t) => (
                  <div
                    key={t.slug}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.02]"
                  >
                    <span className="text-sm text-[#aaa] truncate">{t.title}</span>
                    <span className="text-xs text-[#555] shrink-0 ml-2">{t.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
