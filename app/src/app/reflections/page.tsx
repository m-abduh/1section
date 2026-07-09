"use client";

import { BookOpen, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/format";
import ModuleListPage from "@/components/ModuleListPage";
import { useReflections, useDeleteReflection } from "@/lib/query-hooks";
import { useAuth } from "@/lib/auth-context";

export default function ReflectionListPage() {
  const { user } = useAuth();
  const { data: reflections, isLoading } = useReflections();
  const deleteMutation = useDeleteReflection();

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16 text-center">
        <BookOpen size={32} className="mx-auto text-muted-dark mb-4" />
        <h1 className="text-3xl font-black mb-4">Sign in to view your reflections</h1>
        <Link href="/login" className="inline-flex items-center gap-2 bg-fg text-bg px-6 py-3 rounded-lg font-semibold">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <ModuleListPage
      title="Reflections"
      icon={BookOpen}
      emptyMessage="No reflections yet."
      emptySubtext=""
      items={reflections || []}
      isLoading={isLoading}
      searchPlaceholder="Search reflections..."
      description={`${reflections?.length || 0} reflection${reflections?.length !== 1 ? "s" : ""} written across your modules`}
      layout="columns"
      filterFn={(ref, search) =>
        ref.title.toLowerCase().includes(search.toLowerCase()) ||
        ref.content.toLowerCase().includes(search.toLowerCase()) ||
        (ref.module?.title?.toLowerCase().includes(search.toLowerCase()) ?? false)
      }
      renderCard={(ref, idx) => (
        <motion.div
          key={ref.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.04 }}
          className="group relative break-inside-avoid mb-5"
        >
          <Link
            href={ref.module?.slug ? `/models/${ref.module.slug}` : '#'}
            className="block bg-bg-card border border-white/10 rounded-2xl hover:border-white/20 hover:shadow-sm transition-all duration-200 no-underline overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                {ref.module?.category && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-bg-elevated border border-white/10 text-[0.6875rem] font-semibold text-muted">
                    {ref.module.category.replace(/-/g, ' ')}
                  </span>
                )}
                {ref.module?.title && (
                  <span className="text-[0.75rem] text-muted">
                    {ref.module.title}
                  </span>
                )}
                <span className="ml-auto text-[0.6875rem] text-muted">
                  {formatDate(new Date(ref.timestamp).getTime())}
                </span>
              </div>

              <h3 className="text-[1.0625rem] font-bold text-fg mb-3 leading-snug tracking-[-0.01em]">
                {ref.title}
              </h3>

              <p className="text-[0.875rem] text-muted leading-relaxed whitespace-pre-wrap">
                {ref.content}
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(ref.id); }}
            disabled={deleteMutation.isPending}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-muted-dark/60 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer bg-transparent border-none disabled:opacity-30"
          >
            <Trash2 size={12} />
          </button>
        </motion.div>
      )}
      emptyAction={
        <Link
          href="/models"
          className="inline-flex items-center gap-1.5 mt-3 text-[0.8125rem] text-muted hover:text-fg transition-colors"
        >
          Start a module <ArrowRight size={12} />
        </Link>
      }
    />
  );
}
