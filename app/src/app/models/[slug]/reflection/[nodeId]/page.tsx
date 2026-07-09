"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Check, Lock } from "lucide-react";
import { use } from "react";
import { useModule, useCreateReflection } from "@/lib/query-hooks";
interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}
import { getSlides } from "@/lib/course-content";
import { toast } from "sonner";

export default function NodeReflectionPage({ params }: { params: Promise<{ slug: string; nodeId: string }> }) {
  const { slug, nodeId } = use(params);
  const router = useRouter();
  const { data: module, isLoading } = useModule(slug);
  const createMutation = useCreateReflection();

  const slides = getSlides(module?.nodes || []);
  const nodeSlides = slides.filter((s) => s.nodeId === nodeId);
  const nodeLabel = nodeSlides[0]?.nodeLabel || "Unknown Node";

  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charLimit = 5000;
  const charCount = content.length;
  const charPercent = Math.min((charCount / charLimit) * 100, 100);
  const nearLimit = charCount > charLimit * 0.85;

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  const handleSubmit = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await createMutation.mutateAsync({
        title: `Reflection on ${nodeLabel}`,
        content: content.trim(),
        moduleSlug: slug,
      });
      setContent("");
      setSaved(true);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (err: unknown) {
      const msg = (err as ApiError)?.response?.data?.error?.message || "Failed to save reflection. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 400) + "px";
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg">
        <div className="w-6 h-6 border-2 border-border border-t-fg rounded-full animate-spin" />
      </div>
    );
  }

  if (module?.locked) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg">
        <div className="text-center">
          <Lock size={32} className="mx-auto text-muted-dark mb-4" />
          <p className="text-sm text-muted">Subscribe to access this reflection.</p>
          <button
            onClick={() => router.push(`/models/${slug}`)}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-bg-elevated border border-border text-muted hover:text-fg transition-all cursor-pointer"
          >
            Back to path
          </button>
        </div>
      </div>
    );
  }

  if (!module) return null;

  return (
    <div className="h-full bg-bg flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/models/${slug}`)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-bg-elevated transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-muted-dark">Reflection</p>
            <p className="text-sm font-semibold text-fg">{nodeLabel}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[600px] mx-auto">
          <p className="text-sm text-muted leading-relaxed mb-6">
            Reflect on what you&apos;ve learned from <strong className="text-fg">{nodeLabel}</strong>. 
            What stood out to you? How can you apply this in your own life?
          </p>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onInput={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="Write your reflection..."
            maxLength={charLimit}
            rows={6}
            className="w-full bg-bg-elevated/50 border border-border rounded-xl p-4 text-sm text-fg placeholder:text-muted-dark focus:outline-none focus:border-fg/40 resize-none transition-colors"
          />

          {/* Char count */}
          <div className="flex items-center justify-between mt-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-32 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    nearLimit ? 'bg-amber-500' : 'bg-muted-dark'
                  }`}
                  style={{ width: `${charPercent}%` }}
                />
              </div>
              <span className={`text-[10px] ${nearLimit ? 'text-amber-500' : 'text-muted-dark'}`}>
                {charCount}/{charLimit}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-fg text-bg rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <Check size={16} />
              ) : (
                <Send size={16} />
              )}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Reflection"}
            </button>
            <button
              onClick={() => router.push(`/models/${slug}`)}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-bg-elevated border border-border text-muted hover:text-fg hover:border-border-light transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
