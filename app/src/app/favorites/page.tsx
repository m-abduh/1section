"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { ModuleCard } from "@/components/ModuleCard";
import { PageHeader } from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import { useFavorites } from "@/lib/query-hooks";
import { useAuth } from "@/lib/auth-context";
import { calculateDurations } from "@/lib/calculate";

const PER_PAGE = 10;

export default function FavoritesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: favorites, isLoading } = useFavorites();

  const filteredModules = (favorites || []).filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredModules.length / PER_PAGE));
  const pagedModules = filteredModules.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16 text-center">
        <Bookmark size={32} className="mx-auto text-muted-dark mb-4" />
        <h1 className="text-3xl font-black mb-4">Sign in to view your favorites</h1>
        <Link href="/login" className="inline-flex items-center gap-2 bg-fg text-bg px-6 py-3 rounded-lg font-semibold">
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
        icon={<Bookmark size={16} />}
        title="Favorites"
        description="Your saved mental models for quick access."
        search={{ value: search, onChange: setSearch, placeholder: "Search favorites..." }}
      />

      {pagedModules.length > 0 ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-4 md:gap-8">
            {pagedModules.map((module, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={module.slug}
              >
                <ModuleCard module={{
                  ...module,
                  isFavorited: true,
                  ...(() => {
                    const text = (module.nodes || []).map(n => [
                      n.data.label || '',
                      n.data.description || '',
                      ...(n.data.content || [])
                    ].join(' ')).join(' ');
                    return calculateDurations(text);
                  })()
                }} />
              </motion.div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <div className="text-center py-20">
          <Bookmark size={32} className="mx-auto text-muted-dark mb-4" />
          <p className="text-muted-dark text-[0.875rem]">No favorites yet</p>
          <Link href="/models" className="text-[#f97316] text-[0.8125rem] hover:underline mt-2 inline-block">
            Browse models →
          </Link>
        </div>
      )}
    </div>
  );
}
