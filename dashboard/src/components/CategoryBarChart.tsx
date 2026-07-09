"use client";

import { useRef, useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import EmptyState from "@/components/EmptyState";

interface CategoryDataPoint {
  name: string;
  count: number;
}

interface CategoryBarChartProps {
  data: CategoryDataPoint[];
  totalModules: number;
}

const fmt = (n: number) => n.toLocaleString("en-US");

export default function CategoryBarChart({ data, totalModules }: CategoryBarChartProps) {
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
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-white">Modules by Category</h3>
            <p className="text-xs text-white/30 mt-0.5">{fmt(totalModules)} total modules</p>
          </div>
        </div>
        <div ref={chartRef} className="h-[240px] max-sm:h-[200px]">
          {data.length > 0 && dims.width > 0 ? (
            <BarChart width={dims.width} height={dims.height} data={data} layout="vertical" barCategoryGap={8}>
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
                {data.map((_: CategoryDataPoint, i: number) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? "#f59e0b" : `rgba(255, 255, 255, ${Math.max(0.08, 0.18 - i * 0.03)})`}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <EmptyState className="h-full" />
          )}
        </div>
      </div>
    </div>
  );
}
