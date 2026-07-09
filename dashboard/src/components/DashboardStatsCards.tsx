"use client";

import { BookOpen, Users, Sparkles, DollarSign } from "lucide-react";
import StatCard from "@/components/StatCard";

const fmt = (n: number) => n.toLocaleString("en-US");
const currency = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

interface DashboardStatsCardsProps {
  totalModules: number;
  totalUsers: number;
  premiumUsers: number;
  totalRevenue: number;
}

export default function DashboardStatsCards({
  totalModules,
  totalUsers,
  premiumUsers,
  totalRevenue,
}: DashboardStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Modules" value={fmt(totalModules)} icon={BookOpen} color="#a78bfa" />
      <StatCard title="Active Users" value={fmt(totalUsers)} icon={Users} color="#38bdf8" />
      <StatCard title="Premium Users" value={fmt(premiumUsers)} icon={Sparkles} color="#f59e0b" />
      <StatCard title="Total Revenue" value={currency(totalRevenue)} icon={DollarSign} color="#34d399" />
    </div>
  );
}
