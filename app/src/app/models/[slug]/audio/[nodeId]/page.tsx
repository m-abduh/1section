"use client";

import { notFound, useRouter } from "next/navigation";
import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Headphones, Play, Pause, SkipBack, SkipForward, HelpCircle, MessageSquare, Lock } from "lucide-react";

import { useModule, useSaveProgress } from "@/lib/query-hooks";
import { useTTS } from "@/hooks/useTTS";
import { getSlides, Slide } from "@/lib/course-content";
import { NotebookSlide } from "@/components/NotebookSlide";

export default function AudioPage({ params }: { params: Promise<{ slug: string; nodeId: string }> }) {
  const { slug, nodeId } = React.use(params);
  const router = useRouter();
  const { data: module, isLoading } = useModule(slug);

  const nodes = useMemo(() => module?.nodes || [], [module]);
  const allSlides = useMemo(() => getSlides(nodes), [nodes]);
  const slides = useMemo(
    () => allSlides.filter((s) => s.nodeId === nodeId),
    [allSlides, nodeId],
  );

  const { offsets, fullText } = useMemo(() => {
    const o: number[] = [0];
    const parts: string[] = [];
    for (const s of slides) {
      parts.push(s.content);
      o.push(o[o.length - 1] + s.content.length + 1);
    }
    return { offsets: o, fullText: parts.join(" ") };
  }, [slides]);

  const tts = useTTS(fullText);
  const { isPlaying, progress, currentCharIndex, voices, selectedVoice, rate, durationInfo, togglePlay, seek, seekEnd, setRate, setVoice } = tts;

  const currentSection = useMemo(() => {
    const idx = offsets.findIndex((o, i) => currentCharIndex >= o && currentCharIndex < (offsets[i + 1] ?? Infinity));
    return idx >= 0 ? idx : -1;
  }, [offsets, currentCharIndex]);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && currentSection >= 0) {
      const el = contentRef.current.children[currentSection] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentSection]);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const activeSlide = slides[currentSection];

  const saveProgress = useSaveProgress();
  const handleDone = useCallback(async () => {
    await saveProgress.mutateAsync({ slug, nodeId, listeningProgress: 100, completed: true });
    router.push(`/models/${slug}`);
  }, [slug, nodeId, saveProgress, router]);

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
          <p className="text-sm text-muted">Subscribe to access this audio content.</p>
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

  if (!module || nodes.length === 0 || slides.length === 0) notFound();

  return (
    <div className="h-full bg-bg flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/models/${slug}`)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-bg-elevated transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-muted text-sm">
              <Headphones className="w-4 h-4" />
              <span className="hidden sm:inline">{module.title}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative h-2 bg-border rounded-full overflow-hidden cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            seek(pct);
            seekEnd();
          }}
        >
          <div className="h-full bg-fg rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5" />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-dark">
          <span>{durationInfo.currentFormatted(progress)}</span>
          <span>{durationInfo.totalFormatted}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-5 px-4 py-3">
        <select
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-xs font-medium text-muted focus:outline-none cursor-pointer"
        >
          {speeds.map((s) => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>

        <button
          onClick={() => seek(0)}
          className="w-9 h-9 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-muted hover:text-fg hover:border-border-light transition-all cursor-pointer"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-fg text-bg flex items-center justify-center hover:opacity-90 transition-all cursor-pointer shadow-lg"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>

        <button
          onClick={() => seek(100)}
          className="w-9 h-9 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-muted hover:text-fg hover:border-border-light transition-all cursor-pointer"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <select
          value={selectedVoice}
          onChange={(e) => setVoice(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-xs text-muted focus:outline-none cursor-pointer max-w-[100px] truncate"
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>{v.displayName}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-3" ref={contentRef}>
          {slides.map((slide: Slide, i: number) => {
            const isActive = i === currentSection;
            const isPast = i < currentSection;
            const isFirstInNode = i === 0 || slide.nodeIndex !== slides[i - 1].nodeIndex;
            return (
              <div
                key={i}
                className={`relative rounded-xl border p-4 sm:p-5 transition-all duration-500 ${
                  isActive
                    ? 'border-fg/40 bg-fg/[0.03] shadow-[0_0_20px_rgba(255,255,255,0.04)]'
                    : isPast
                      ? 'border-border bg-bg-elevated/20 opacity-50'
                      : 'border-border bg-transparent'
                }`}
                onClick={() => {
                  const pct = (offsets[i] / fullText.length) * 100;
                  seek(pct);
                  seekEnd();
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 cursor-pointer ${
                    isActive
                      ? 'bg-fg text-bg'
                      : isPast
                        ? 'bg-green-900/50 text-green-400 border border-green-500/30'
                        : 'bg-bg-elevated border border-border text-muted-dark'
                  }`}>
                    {isPast ? "✓" : isFirstInNode ? slide.nodeIndex + 1 : "·"}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isFirstInNode && (
                      <h3 className="text-sm font-semibold mb-1 text-fg/90">
                        {slide.nodeLabel}
                      </h3>
                    )}
                    <p className={`text-xs leading-relaxed ${
                      isActive ? 'text-fg/80' : 'text-muted'
                    }`}>
                      {slide.content}
                    </p>
                    {isActive && (
                      <NotebookSlide
                        moduleSlug={slug}
                        nodeId={nodeId}
                        nodeLabel={slide.nodeLabel}
                        slideIndex={slide.slideIndex}
                        slideContent={slide.content}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Action buttons */}
          <div className="pt-4 pb-2 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push(`/models/${slug}/quiz/${nodeId}`)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-bg-elevated border border-border text-muted hover:text-fg hover:border-border-light transition-all cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Quiz
            </button>
            <button
              onClick={() => router.push(`/models/${slug}/reflection/${nodeId}`)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-bg-elevated border border-border text-muted hover:text-fg hover:border-border-light transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Reflect
            </button>
            <button
              onClick={handleDone}
              className="px-5 py-2 text-xs font-medium rounded-lg bg-green-600 text-white hover:opacity-90 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
