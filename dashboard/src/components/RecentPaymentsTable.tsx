"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface Payment {
  id?: string;
  user?: { name?: string | null; email?: string };
  amount: number;
  planType?: string;
  status: string;
  createdAt?: string;
}

interface RecentPaymentsTableProps {
  payments: Payment[];
}

export default function RecentPaymentsTable({ payments }: RecentPaymentsTableProps) {
  return (
    <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 lg:col-span-2 overflow-hidden">
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Payments</h3>
            <p className="text-xs text-white/30 mt-0.5">Last {payments.length} transactions</p>
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
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-white/20 text-sm">No payments yet</td>
                </tr>
              ) : (
                payments.map((p: Payment, i: number) => (
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
  );
}
