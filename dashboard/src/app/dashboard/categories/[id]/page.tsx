"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Eye,
  Save,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useCategory, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useAdmin";

interface CategoryFormData {
  name: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const isNew = id === "new";

  const [editing, setEditing] = useState(isNew);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<CategoryFormData>({
    name: "",
  });

  const { data: cat, isLoading } = useCategory(isNew ? "" : id);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  useEffect(() => {
    if (cat && !isNew && !editing) {
      setForm({
        name: cat.name || "",
      });
    }
  }, [cat, editing, isNew]);

  const updateField = useCallback(<K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSave = () => {
    if (isNew) {
      createMutation.mutate({
        name: form.name,
        slug: slugify(form.name),
      });
    } else {
      updateMutation.mutate({
        id,
        data: {
          name: form.name || undefined,
        },
      });
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(id);
  };

  useEffect(() => {
    if (createMutation.isSuccess && !isNew) {
      toast.success("Category created");
      router.replace(`/dashboard/categories/${(createMutation as any).data?.id || id}`);
    } else if (createMutation.isSuccess) {
      toast.success("Category created");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setEditing(false);
      router.replace(`/dashboard/categories`);
    }
  }, [createMutation.isSuccess, createMutation.data, isNew, router, queryClient]);

  useEffect(() => {
    if (updateMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["admin", "category", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setEditing(false);
      toast.success("Category updated");
    }
  }, [updateMutation.isSuccess, id, queryClient]);

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Category deleted");
      router.replace("/dashboard/categories");
    }
  }, [deleteMutation.isSuccess, queryClient, router]);

  useEffect(() => {
    if (createMutation.isError) {
      const msg = (createMutation.error as any)?.response?.data?.error?.message || "Failed to create";
      toast.error(typeof msg === "string" ? msg : "Failed to create");
    }
    if (updateMutation.isError) {
      const msg = (updateMutation.error as any)?.response?.data?.error?.message || "Failed to update";
      toast.error(typeof msg === "string" ? msg : "Failed to update");
    }
    if (deleteMutation.isError) {
      const msg = (deleteMutation.error as any)?.response?.data?.error?.message || "Failed to delete";
      toast.error(typeof msg === "string" ? msg : "Failed to delete");
      setDeleting(false);
    }
  }, [createMutation.isError, updateMutation.isError, deleteMutation.isError, createMutation.error, updateMutation.error, deleteMutation.error]);

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!cat && !isNew) {
    return (
      <div className="text-center py-20">
        <p className="text-[#555]">Category not found</p>
        <Link href="/dashboard/categories" className="text-sm text-white underline mt-4 inline-block">
          Back to categories
        </Link>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-[720px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/categories"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-all"
        >
          <ArrowLeft size={16} /> Back to Categories
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              {!isNew && (
                <button
                  onClick={() => { setEditing(false); setDeleting(false); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Eye size={15} /> Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white text-black hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Save size={15} /> {isSaving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            !isNew && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/15 transition-all"
              >
                <Pencil size={15} /> Rename
              </button>
            )
          )}
        </div>
      </div>

      {editing ? (
        /* ===== EDIT MODE ===== */
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 space-y-5">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">
            {isNew ? "New Category" : "Rename Category"}
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/40">Name</label>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-all"
              placeholder="e.g., Productivity"
            />
          </div>

          <p className="text-xs text-white/20">
            Slug will be auto-generated: <span className="font-mono text-white/30">{slugify(form.name) || "(auto)"}</span>
          </p>
        </div>
      ) : !isNew ? (
        /* ===== VIEW MODE ===== */
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Name</p>
              <p className="text-lg font-bold text-white">{cat.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Modules</p>
              <p className="text-sm text-[#888]">{cat._count?.modules ?? 0} modules</p>
            </div>
          </div>

          {/* Associated Modules */}
          {cat.modules && cat.modules.length > 0 && (
            <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">
                Modules in this Category
              </h3>
              <div className="space-y-2">
                {cat.modules.map((m: any) => (
                  <div
                    key={m.id}
                    onClick={() => router.push(`/dashboard/modules/${m.slug}`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-[#555]">
                      {m.title?.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{m.title}</div>
                      <div className="text-xs text-[#555] font-mono">{m.slug}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Delete Section */}
      {!isNew && !editing && (
        <div className="border border-red-500/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
              <p className="text-xs text-white/30 mt-1">Delete this category. All modules in this category will have their category cleared.</p>
            </div>
            {deleting ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleting(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  <AlertTriangle size={14} /> Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleting(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
