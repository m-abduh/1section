"use client";

import { useRouter } from "next/navigation";
import { Plus, Tag } from "lucide-react";
import DataTable from "@/components/DataTable";
import { useCategories } from "@/hooks/useAdmin";

export default function CategoriesPage() {
  const router = useRouter();

  const { data: categories, isLoading } = useCategories();

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (c: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <Tag size={14} className="text-[#666]" />
          </div>
          <div>
            <div className="text-white font-medium">{c.name}</div>
            <div className="text-[#555] text-xs font-mono">{c.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "_count",
      label: "Modules",
      sortable: true,
      render: (c: any) => (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/5 text-[#888]">
          {c._count?.modules ?? 0}
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
          <h2 className="text-2xl font-black text-white">Categories</h2>
          <p className="text-sm text-[#666] mt-1">Manage categories and organize your content.</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/categories/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-black hover:opacity-90 transition-all"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      <DataTable
        columns={columns}
        data={categories || []}
        searchKeys={["name", "slug", "description"]}
        onRowClick={(c) => router.push(`/dashboard/categories/${c.id}`)}
      />
    </div>
  );
}
