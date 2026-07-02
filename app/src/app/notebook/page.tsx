"use client";

import { useState, useEffect } from "react";
import { FileText, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import { useNotebook, useDeleteNotebook } from "@/lib/query-hooks";
import { useAuth } from "@/lib/auth-context";

const PER_PAGE = 12;

export default function NotebookPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: entries, isLoading } = useNotebook();
  const deleteMutation = useDeleteNotebook();

  const filtered = (entries || []).filter(
    (e) =>
      !search ||
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      e.slideContent?.toLowerCase().includes(search.toLowerCase()) ||
      e.nodeLabel.toLowerCase().includes(search.toLowerCase()) ||
      e.module?.title?.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDelete = async (moduleSlug: string, nodeId: string, slideIndex: number) => {
    await deleteMutation.mutateAsync({ moduleSlug, nodeId, slideIndex });
  };

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16 text-center">
        <FileText size={32} className="mx-auto text-muted-dark mb-4" />
        <h1 className="text-3xl font-black mb-4">Sign in to view your notebook</h1>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-fg text-bg px-6 py-3 rounded-lg font-semibold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-fg rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16">
      <PageHeader
        icon={<FileText size={16} />}
        title="Notebook"
        description={`${entries?.length || 0} note${entries?.length !== 1 ? "s" : ""} saved across your slides`}
        search={{ value: search, onChange: setSearch, placeholder: "Search notes..." }}
      />

      {!entries || entries.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-[0.9375rem] text-muted-dark">No notes yet.</p>
          <Link
            href="/models"
            className="inline-flex items-center gap-1.5 mt-3 text-[0.8125rem] text-muted hover:text-fg transition-colors"
          >
            Start a module <ArrowRight size={12} />
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-dark text-[0.875rem]">
          No notes match your search.
        </div>
      ) : (
        <>
          <div className="columns-1 sm:columns-2 xl:columns-3 gap-5">
            {filtered
              .slice((page - 1) * PER_PAGE, page * PER_PAGE)
              .map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group relative break-inside-avoid mb-5"
                >
                    <Link
                      href={`/models/${entry.module.slug}/read/${entry.nodeId}?slide=${entry.slideIndex}`}
                      className="block bg-bg-card border border-white/10 rounded-2xl hover:border-white/20 hover:shadow-sm transition-all duration-200 no-underline overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          {entry.module?.category && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-bg-elevated border border-white/10 text-[0.6875rem] font-semibold text-muted">
                              {entry.module.category.replace(/-/g, " ")}
                            </span>
                          )}
                          <span className="text-[0.8125rem] text-muted">
                            {entry.module.title}
                          </span>
                          <span className="ml-auto text-[0.6875rem] text-muted">
                            {formatDate(new Date(entry.updatedAt).getTime())}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fg/15 border border-white/10 text-[0.6875rem] font-semibold text-fg">
                            <FileText size={11} />
                            {entry.nodeLabel}
                          </span>
                          <span className="text-[0.6875rem] text-muted">
                            Slide {entry.slideIndex + 1}
                          </span>
                        </div>

                        {entry.slideContent && (
                          <div className="mb-3 pl-3 border-l-2 border-white/10">
                            <p className="text-[0.8125rem] text-muted leading-relaxed italic">
                              &ldquo;{entry.slideContent}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="bg-bg-elevated/60 rounded-xl px-4 py-3 border border-white/10">
                          <p className="text-[0.9375rem] text-fg leading-relaxed whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry.module.slug, entry.nodeId, entry.slideIndex);
                      }}
                      disabled={deleteMutation.isPending}
                      className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-muted-dark/60 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer bg-transparent border-none disabled:opacity-30"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
              ))}
          </div>
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(filtered.length / PER_PAGE))}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
