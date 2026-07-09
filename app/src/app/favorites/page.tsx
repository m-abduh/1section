"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { ModuleCard } from "@/components/ModuleCard";
import ModuleListPage from "@/components/ModuleListPage";
import { useFavorites } from "@/lib/query-hooks";
import { useAuth } from "@/lib/auth-context";
import { calculateDurations } from "@/lib/calculate";

export default function FavoritesPage() {
  const { user } = useAuth();
  const { data: favorites, isLoading } = useFavorites();

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

  const modules = favorites || [];

  return (
    <ModuleListPage
      title="Favorites"
      icon={Bookmark}
      emptyMessage="No favorites yet"
      emptySubtext=""
      items={modules}
      isLoading={isLoading}
      searchPlaceholder="Search favorites..."
      description="Your saved mental models for quick access."
      pageSize={10}
      filterFn={(m, search) =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase())
      }
      renderCard={(module) => (
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
      )}
      emptyAction={
        <Link href="/models" className="text-[#f97316] text-[0.8125rem] hover:underline mt-2 inline-block">
          Browse models →
        </Link>
      }
    />
  );
}
