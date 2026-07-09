"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import Pagination from "@/components/Pagination";

export interface ModuleListPageProps<T> {
  title: string;
  icon: React.ElementType;
  emptyMessage: string;
  emptySubtext: string;
  items: T[];
  isLoading: boolean;
  renderCard: (item: T, index: number) => React.ReactNode;
  searchPlaceholder?: string;
  description?: string;
  pageSize?: number;
  layout?: "grid" | "columns";
  emptyAction?: React.ReactNode;
  noResultsMessage?: string;
  filterFn?: (item: T, search: string) => boolean;
}

export default function ModuleListPage<T>({
  title,
  icon: Icon,
  emptyMessage,
  emptySubtext,
  items,
  isLoading,
  renderCard,
  searchPlaceholder = "Search...",
  description,
  pageSize = 12,
  layout = "grid",
  emptyAction,
  noResultsMessage = "No results match your search.",
  filterFn,
}: ModuleListPageProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    if (!search || !filterFn) return items;
    return items.filter((item) => filterFn(item, search));
  }, [items, search, filterFn]);

  useEffect(() => { setPage(1); }, [search]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-fg rounded-full animate-spin" />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16">
      <PageHeader
        icon={<Icon size={16} />}
        title={title}
        description={description}
        search={{ value: search, onChange: setSearch, placeholder: searchPlaceholder }}
      />

      {items.length === 0 ? (
        <div className="text-center py-24">
          <Icon size={32} className="mx-auto text-muted-dark mb-4" />
          <p className="text-[0.9375rem] text-muted-dark">{emptyMessage}</p>
          {emptySubtext && <p className="text-[0.8125rem] text-muted mt-2">{emptySubtext}</p>}
          {emptyAction}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 text-muted-dark text-[0.875rem]">
          {noResultsMessage}
        </div>
      ) : (
        <>
          {layout === "columns" ? (
            <div className="columns-1 sm:columns-2 xl:columns-3 gap-5">
              {pagedItems.map((item, idx) => (
                <div key={idx} className="break-inside-avoid mb-5">
                  {renderCard(item, idx)}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-4 md:gap-8">
              {pagedItems.map((item, idx) => (
                <div key={idx}>
                  {renderCard(item, idx)}
                </div>
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
