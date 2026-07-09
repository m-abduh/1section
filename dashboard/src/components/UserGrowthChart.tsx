"use client";

import { useRef, useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

interface UserGrowthDataPoint {
  date: string;
  free: number;
  premium: number;
}

interface UserGrowthChartProps {
  data: UserGrowthDataPoint[];
  days: number;
  onDaysChange: (days: number) => void;
}

export default function UserGrowthChart({ data, days, onDaysChange }: UserGrowthChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 240 });

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setDims(w => w.width !== width ? { width, height: height || 240 } : w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white">User Growth</h3>
          <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
            <button onClick={() => onDaysChange(7)} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${days === 7 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>7 days</button>
            <button onClick={() => onDaysChange(30)} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${days === 30 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>30 days</button>
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
      <div ref={chartRef} className="h-[240px] max-sm:h-[200px]">
        {data.length > 0 && dims.width > 0 ? (
          <LineChart width={dims.width} height={dims.height} data={data}>
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
        ) : (
          <div className="h-full flex items-center justify-center text-white/20 text-sm">No data</div>
        )}
      </div>
    </div>
  );
}
