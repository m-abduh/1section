"use client";

import { useState, useEffect } from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (totalPages <= 1) return null;

  const btnBase = "w-10 h-10 rounded-lg bg-bg-card border border-border-subtle text-muted flex items-center justify-center transition-all duration-200 cursor-pointer hover:border-border-light";
  const btnDisabled = "opacity-30 cursor-not-allowed";

  return (
    <div className="flex justify-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className={`${btnBase} ${page === 1 ? btnDisabled : ""}`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isMobile
        ? Array.from(
            { length: Math.min(3, totalPages) },
            (_, i) => Math.max(1, Math.min(page - 1, totalPages - 2)) + i
          ).map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-10 h-10 rounded-lg font-bold text-[0.875rem] transition-all duration-200 ${page === p ? "bg-fg text-bg" : "bg-bg-card border border-border-subtle text-muted hover:border-border-light"}`}
            >
              {p}
            </button>
          ))
        : getPageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="w-10 h-10 flex items-center justify-center text-muted-dark text-sm">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-10 h-10 rounded-lg font-bold text-[0.875rem] transition-all duration-200 ${page === p ? "bg-fg text-bg" : "bg-bg-card border border-border-subtle text-muted hover:border-border-light"}`}
              >
                {p}
              </button>
            )
          )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className={`${btnBase} ${page === totalPages ? btnDisabled : ""}`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
