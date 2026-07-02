"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  show: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export default function TableOfContents({ show, onClose, onNavigate }: Props) {
  const headings: TocItem[] = [];

  if (typeof window !== "undefined") {
    const elements = document.querySelectorAll("h2, h3");
    elements.forEach((el) => {
      if (el.id) {
        headings.push({
          id: el.id,
          text: el.textContent || "",
          level: Number(el.tagName[1]),
        });
      }
    });
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 z-[3000] w-[280px] max-w-[85vw] shadow-2xl bg-bg-card border-l border-border"
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <h4 className="text-sm font-bold text-fg">Contents</h4>
            <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-fg">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(100%-56px)] px-3 py-3">
            {headings.length === 0 && (
              <p className="text-xs text-muted text-center py-8">No headings found.</p>
            )}
            {headings.map((h) => (
              <button
                key={h.id}
                onClick={() => { onNavigate(h.id); onClose(); }}
                className={`block w-full text-left px-3 py-2 rounded-lg transition-all hover:bg-bg-elevated text-muted ${
                  h.level === 2 ? "font-medium text-sm" : "font-normal text-xs"
                }`}
                style={{ paddingLeft: `${12 + (h.level - 2) * 16}px` }}
              >
                {h.text}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
