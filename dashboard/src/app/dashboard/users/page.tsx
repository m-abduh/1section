"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import DataTable from "@/components/DataTable";

export default function UsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users-list"],
    queryFn: async () => {
      const { data } = await api.get("/auth/users");
      return Array.isArray(data) ? data : [];
    },
  });

  const columns = [
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (u: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-[#888]">
            {u.name?.charAt(0)?.toUpperCase() || u.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium">{u.email}</div>
            {u.name && <div className="text-[#555] text-xs">{u.name}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (u: any) => (
        <span className="text-[#ccc]">{u.name || "—"}</span>
      ),
    },
    {
      key: "subscriptionStatus",
      label: "Plan",
      sortable: true,
      render: (u: any) => (
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            u.subscriptionStatus && u.subscriptionStatus !== "FREE"
              ? "bg-[#ffb8001a] text-[#ffb800]"
              : "bg-white/5 text-[#666]"
          }`}
        >
          {u.subscriptionStatus || "FREE"}
        </span>
      ),
    },
    {
      key: "streakCount",
      label: "Streak",
      sortable: true,
      render: (u: any) => (
        <span className="text-[#34d399] font-bold">{u.streakCount || 0}d</span>
      ),
    },
    {
      key: "preferredCategories",
      label: "Categories",
      render: (u: any) => (
        <div className="flex gap-1 flex-wrap">
          {(u.preferredCategories || []).slice(0, 2).map((c: string) => (
            <span key={c} className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-[#555]">
              {c}
            </span>
          ))}
          {u.preferredCategories?.length > 2 && (
            <span className="text-[10px] text-[#444]">+{u.preferredCategories.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      sortable: true,
      render: (u: any) => (
        <span className="text-[#555] text-sm">
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
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
      <div>
        <h2 className="text-2xl font-black text-white">Users</h2>
        <p className="text-sm text-[#666] mt-1">Manage platform users and subscriptions.</p>
      </div>

      <DataTable
        columns={columns}
        data={users || []}
        searchKeys={["email", "name"]}
      />
    </div>
  );
}
