import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export default function StatCard({ title, value, icon: Icon, color = "#fff" }: StatCardProps) {
  return (
    <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 max-sm:p-4 flex items-start gap-4 hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5">
      <div
        className="w-12 h-12 max-sm:w-10 max-sm:h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/[0.06] transition-all duration-300 group-hover:scale-105"
        style={{ background: `${color}18`, color }}
      >
        <Icon size={20} className="max-sm:size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-white tracking-tight tabular-nums">{value}</div>
        <div className="text-sm text-white/40 mt-0.5 font-medium">{title}</div>
      </div>
      <div
        className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    </div>
  );
}
