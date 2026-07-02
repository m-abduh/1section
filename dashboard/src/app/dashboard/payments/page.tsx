"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import DataTable from "@/components/DataTable";
import { RefreshCw } from "lucide-react";

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [confirmMode, setConfirmMode] = useState<"dev" | "prod" | null>(null);

  const { data: payments, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data } = await api.get("/payments/history?all=true");
      return Array.isArray(data) ? data : data.data || [];
    },
    refetchInterval: false,
  });

  const { data: lsMode } = useQuery({
    queryKey: ["admin", "ls-mode"],
    queryFn: async () => {
      const { data } = await api.get("/admin/ls-mode");
      return data;
    },
    refetchInterval: false,
  });

  const toggleLs = useMutation({
    mutationFn: async (mode: "dev" | "prod") => {
      const { data } = await api.post("/admin/ls-mode", { mode });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ls-mode"] });
    },
  });

  const columns = [
    {
      key: "user",
      label: "User",
      sortable: true,
      render: (p: any) => (
        <div className="text-sm">
          <div className="text-white">{p.user?.name || "—"}</div>
          <div className="text-[#555] text-xs">{p.user?.email || "—"}</div>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (p: any) => <span className="text-white font-semibold">${(p.amount / 100).toFixed(2)}</span>,
    },
    {
      key: "description",
      label: "Description",
      render: (p: any) => (
        <span className="text-sm text-[#ccc]">{p.description}</span>
      ),
    },
    {
      key: "planType",
      label: "Plan",
      sortable: true,
      render: (p: any) => (
        <span className="text-xs bg-white/5 px-2.5 py-1 rounded-full text-[#888]">
          {p.planType}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (p: any) => (
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            p.status === "SUCCEEDED"
              ? "bg-[#34d3991a] text-[#34d399]"
              : p.status === "PENDING"
              ? "bg-[#ffb8001a] text-[#ffb800]"
              : p.status === "REFUNDED"
              ? "bg-[#38bdf81a] text-[#38bdf8]"
              : "bg-[#ef44441a] text-[#ef4444]"
          }`}
        >
          {p.status}
        </span>
      ),
    },
    {
      key: "lsOrderId",
      label: "Order ID",
      render: (p: any) => (
        <span className="text-[#555] text-xs font-mono">
          {p.lsOrderId?.slice(0, 14)}...
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (p: any) => (
        <span className="text-[#555]">
          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const currentMode = lsMode?.mode || "dev";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Payments</h2>
          <p className="text-sm text-[#666] mt-1">View transaction history and subscription revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfirmMode(currentMode === "dev" ? "prod" : "dev")}
            disabled={toggleLs.isPending}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-all disabled:opacity-50 ${
              currentMode === "prod"
                ? "bg-[#a855f71a] text-[#a855f7] hover:bg-[#a855f733]"
                : "bg-[#34d3991a] text-[#34d399] hover:bg-[#34d39933]"
            }`}
          >
            {toggleLs.isPending ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-xs font-mono font-bold">{currentMode === "prod" ? "PROD" : "DEV"}</span>
            )}
            <span className="text-[10px] uppercase tracking-wider opacity-60">LS</span>
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 bg-white/5 text-sm text-[#888] px-3 py-2 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payments || []}
        searchKeys={["description", "lsOrderId", "planType", "status", "user.email", "user.name"]}
      />

      {confirmMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Switch LS Environment</h3>
            <p className="text-sm text-[#888] mb-6">
              Are you sure you want to switch to <span className="font-bold text-white uppercase">{confirmMode}</span>?
              {confirmMode === "prod" && (
                <span className="block mt-2 text-[#ffb800] text-xs">This will use the production payment token.</span>
              )}
              {confirmMode === "dev" && (
                <span className="block mt-2 text-[#34d399] text-xs">This will use the development/test payment token.</span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmMode(null)}
                className="flex-1 px-4 py-2.5 bg-white/5 text-[#888] rounded-xl text-sm font-semibold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleLs.mutate(confirmMode);
                  setConfirmMode(null);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  confirmMode === "prod"
                    ? "bg-[#a855f7] text-white hover:bg-[#9333ea]"
                    : "bg-[#34d399] text-black hover:bg-[#2dd4bf]"
                }`}
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
