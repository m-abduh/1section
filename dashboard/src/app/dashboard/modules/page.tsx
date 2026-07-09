"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import DataTable from "@/components/DataTable";
import { useModules, type DashboardModule } from "@/hooks/useAdmin";

export default function ModulesPage() {
  const router = useRouter();

  const { data, isLoading } = useModules();
  const modules = data?.modules || [];

  const columns = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (m: DashboardModule) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-[#555]">
            {m.title?.charAt(0)}
          </div>
          <div>
            <div className="text-white font-medium">{m.title}</div>
            <div className="text-[#555] text-xs">{m.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (m: DashboardModule) => (
        <span className="text-xs bg-white/5 px-2.5 py-1 rounded-full text-[#888]">
          {m.category}
        </span>
      ),
    },
    {
      key: "isDraft",
      label: "Status",
      sortable: true,
      render: (m: DashboardModule) => (
        m.isDraft ? (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400">
            Draft
          </span>
        ) : (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
            Published
          </span>
        )
      ),
    },
    {
      key: "isPremium",
      label: "Access",
      sortable: true,
      render: (m: DashboardModule) => (
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            m.isPremium
              ? "bg-[#ffb8001a] text-[#ffb800]"
              : "bg-[#34d3991a] text-[#34d399]"
          }`}
        >
          {m.isPremium ? "Premium" : "Free"}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Modules</h2>
          <p className="text-sm text-[#666] mt-1">Manage content and organize your library.</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/modules/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-black hover:opacity-90 transition-all"
        >
          <Plus size={16} /> New Module
        </button>
      </div>

      <DataTable
        columns={columns}
        data={modules || []}
        searchKeys={["title", "slug", "category"]}
        onRowClick={(m) => router.push(`/dashboard/modules/${m.slug}`)}
      />
    </div>
  );
}
