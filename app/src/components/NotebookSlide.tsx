"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { PenLine, X, Loader2 } from "lucide-react";
import { useUpsertNotebook, useDeleteNotebook } from "@/lib/query-hooks";
import { useAuthStore } from "@/lib/store/auth";

interface NotebookSlideProps {
  moduleSlug: string;
  nodeId: string;
  nodeLabel: string;
  slideIndex: number;
  slideContent: string;
}

export function NotebookSlide({
  moduleSlug,
  nodeId,
  nodeLabel,
  slideIndex,
  slideContent,
}: NotebookSlideProps) {
  const token = useAuthStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const upsertMutation = useUpsertNotebook();
  const deleteMutation = useDeleteNotebook();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  if (!token) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      await deleteMutation.mutateAsync({ moduleSlug, nodeId, slideIndex });
    } else {
      await upsertMutation.mutateAsync({
        moduleSlug,
        nodeId,
        nodeLabel,
        slideIndex,
        slideContent,
        content: content.trim(),
      });
    }
    setOpen(false);
    setContent("");
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ moduleSlug, nodeId, slideIndex });
    setContent("");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setContent(""); }}
        className="px-2 py-1 text-[10px] font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1 bg-bg-elevated border-border/40 text-muted hover:text-fg hover:border-border/70"
        title="Add note"
      >
        <PenLine size={10} />
        Note
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl p-5 w-full max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-fg">
                {nodeLabel} &middot; Slide {slideIndex + 1}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-muted-dark hover:text-fg hover:bg-bg-elevated transition-colors cursor-pointer bg-transparent border-none"
              >
                <X size={16} />
              </button>
            </div>

            {slideContent && (
              <div className="mb-3 p-3 bg-bg-elevated border border-border-subtle rounded-xl max-h-24 overflow-y-auto text-[0.75rem] text-muted leading-relaxed">
                {slideContent}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note for this slide..."
              className="w-full h-28 resize-none bg-bg border border-border-subtle rounded-xl p-3 text-[0.8125rem] text-fg outline-none focus:border-border transition-colors placeholder:text-muted-dark"
            />

            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-[0.75rem] text-red-400 hover:text-red-300 transition-colors cursor-pointer bg-transparent border-none disabled:opacity-30"
              >
                Delete note
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg text-[0.75rem] font-semibold text-muted hover:text-fg transition-colors cursor-pointer bg-transparent border-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={upsertMutation.isPending || deleteMutation.isPending}
                  className="px-4 py-2 rounded-lg text-[0.75rem] font-semibold bg-fg text-bg hover:opacity-90 transition-all cursor-pointer border-none disabled:opacity-30"
                >
                  {upsertMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
