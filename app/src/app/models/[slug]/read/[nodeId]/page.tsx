"use client";

import { notFound, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useCallback, useState } from "react";
import { ArrowLeft, HelpCircle, MessageSquare, Type, CaseSensitive, ArrowUpDown, ArrowLeftRight, Maximize, Lock } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

import { useModule, useSaveProgress } from "@/lib/query-hooks";
import { getSlides } from "@/lib/course-content";
import { NotebookSlide } from "@/components/NotebookSlide";

type FontSize = "sm" | "md" | "lg" | "xl";
type FontFamily = "inter" | "serif" | "mono" | "outfit";
type LineH = "tight" | "normal" | "relaxed";
type LetterSp = "tight" | "normal" | "wide";
type AspectRatio = "9-16" | "3-4";

const fontSizeValues: Record<FontSize, string> = {
  sm: "4cqi", md: "4.5cqi", lg: "5cqi", xl: "5.5cqi",
};
const fontFamilyValues: Record<FontFamily, string> = {
  inter: "'Inter', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', monospace",
  outfit: "'Outfit', sans-serif",
};
const lineHeightValues: Record<LineH, string> = {
  tight: "1.5", normal: "1.75", relaxed: "2.1",
};
const letterSpacingValues: Record<LetterSp, string> = {
  tight: "-0.02em", normal: "0.02em", wide: "0.05em",
};
const aspectRatioValues: Record<AspectRatio, string> = {
  "9-16": "9/16",
  "3-4": "3/4",
};

const fontSizeOptions: { key: FontSize; label: string }[] = [
  { key: "sm", label: "Sm" },
  { key: "md", label: "Md" },
  { key: "lg", label: "Lg" },
  { key: "xl", label: "Xl" },
];
const fontFamilyOptions: { key: FontFamily; label: string }[] = [
  { key: "inter", label: "Inter" },
  { key: "serif", label: "Serif" },
  { key: "mono", label: "Mono" },
  { key: "outfit", label: "Outfit" },
];
const lineHeightOptions: { key: LineH; label: string }[] = [
  { key: "tight", label: "Tight" },
  { key: "normal", label: "Normal" },
  { key: "relaxed", label: "Relaxed" },
];
const letterSpacingOptions: { key: LetterSp; label: string }[] = [
  { key: "tight", label: "Tight" },
  { key: "normal", label: "Normal" },
  { key: "wide", label: "Wide" },
];
const aspectRatioOptions: { key: AspectRatio; label: string }[] = [
  { key: "9-16", label: "9:16" },
  { key: "3-4", label: "3:4" },
];

function SettingIcon({
  icon: Icon,
  label,
  active,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center gap-0.5">
      <button
        onClick={onClick}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
          active ? "bg-fg/15 text-fg" : "text-muted/70 hover:text-fg hover:bg-bg/50"
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
      </button>
      {active && (
        <span className="text-[7px] font-semibold text-fg/60 uppercase tracking-wider leading-none">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

function Popup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2">
      <div className="bg-bg-elevated border border-border/50 rounded-xl shadow-xl p-2 min-w-[140px]">
        <p className="text-[9px] font-semibold text-muted-dark uppercase tracking-wider mb-1.5 px-1">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`text-[10px] font-medium px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
            value === o.key
              ? "bg-fg text-bg shadow-sm"
              : "bg-bg text-muted border border-border/30 hover:text-fg hover:border-border/60"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ReadPage({ params }: { params: Promise<{ slug: string; nodeId: string }> }) {
  const { slug, nodeId } = React.use(params);
  const router = useRouter();
  const { data: module, isLoading } = useModule(slug);

  const nodes = useMemo(() => module?.nodes || [], [module]);

  const allSlides = useMemo(() => getSlides(nodes), [nodes]);

  const nodeSlides = useMemo(
    () => allSlides.filter((s) => s.nodeId === nodeId),
    [allSlides, nodeId],
  );

  const searchParams = useSearchParams();
  const startSlide = parseInt(searchParams.get('slide') || '0', 10);

  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: startSlide });
  const [selectedIndex, setSelectedIndex] = useState(startSlide);
  const [activeSetting, setActiveSetting] = useState<"fontSize" | "fontFamily" | "lineHeight" | "letterSpacing" | "aspectRatio" | null>(null);

  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [fontFamily, setFontFamily] = useState<FontFamily>("inter");
  const [lineHeight, setLineHeight] = useState<LineH>("normal");
  const [letterSpacing, setLetterSpacing] = useState<LetterSp>("normal");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3-4");

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const saveProgress = useSaveProgress();
  const handleDone = useCallback(async () => {
    await saveProgress.mutateAsync({ slug, nodeId, readingProgress: 100, completed: true });
    router.push(`/models/${slug}`);
  }, [slug, nodeId, saveProgress, router]);

  const currentSlide = nodeSlides[selectedIndex];

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
          <p className="text-sm text-muted">Subscribe to access this reading content.</p>
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

  if (!module || nodes.length === 0) notFound();

  const baseFontSize = fontSizeValues[fontSize];
  const baseFontFamily = fontFamilyValues[fontFamily];
  const baseLineHeight = lineHeightValues[lineHeight];
  const baseLetterSpacing = letterSpacingValues[letterSpacing];
  const baseAspectRatio = aspectRatioValues[aspectRatio];

  return (
    <div className="h-full bg-bg flex flex-col">
      {/* Top fixed settings bar */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pt-2">
        <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md border border-border/60 rounded-xl px-3 py-1.5 shadow-lg">
          <SettingIcon
            icon={Type}
            label={fontSizeOptions.find(o => o.key === fontSize)?.label ?? ""}
            active={activeSetting === "fontSize"}
            onClick={() => setActiveSetting(activeSetting === "fontSize" ? null : "fontSize")}
          >
            {activeSetting === "fontSize" && (
              <Popup title="Font Size">
                <RadioGroup options={fontSizeOptions} value={fontSize} onChange={setFontSize} />
              </Popup>
            )}
          </SettingIcon>

          <SettingIcon
            icon={CaseSensitive}
            label={fontFamilyOptions.find(o => o.key === fontFamily)?.label ?? ""}
            active={activeSetting === "fontFamily"}
            onClick={() => setActiveSetting(activeSetting === "fontFamily" ? null : "fontFamily")}
          >
            {activeSetting === "fontFamily" && (
              <Popup title="Font">
                <RadioGroup options={fontFamilyOptions} value={fontFamily} onChange={setFontFamily} />
              </Popup>
            )}
          </SettingIcon>

          <div className="w-px h-5 bg-border/40" />

          <SettingIcon
            icon={ArrowUpDown}
            label={lineHeightOptions.find(o => o.key === lineHeight)?.label ?? ""}
            active={activeSetting === "lineHeight"}
            onClick={() => setActiveSetting(activeSetting === "lineHeight" ? null : "lineHeight")}
          >
            {activeSetting === "lineHeight" && (
              <Popup title="Line Height">
                <RadioGroup options={lineHeightOptions} value={lineHeight} onChange={setLineHeight} />
              </Popup>
            )}
          </SettingIcon>

          <SettingIcon
            icon={ArrowLeftRight}
            label={letterSpacingOptions.find(o => o.key === letterSpacing)?.label ?? ""}
            active={activeSetting === "letterSpacing"}
            onClick={() => setActiveSetting(activeSetting === "letterSpacing" ? null : "letterSpacing")}
          >
            {activeSetting === "letterSpacing" && (
              <Popup title="Letter Spacing">
                <RadioGroup options={letterSpacingOptions} value={letterSpacing} onChange={setLetterSpacing} />
              </Popup>
            )}
          </SettingIcon>

          <div className="w-px h-5 bg-border/40" />

          <SettingIcon
            icon={Maximize}
            label={aspectRatioOptions.find(o => o.key === aspectRatio)?.label ?? ""}
            active={activeSetting === "aspectRatio"}
            onClick={() => setActiveSetting(activeSetting === "aspectRatio" ? null : "aspectRatio")}
          >
            {activeSetting === "aspectRatio" && (
              <Popup title="Aspect Ratio">
                <RadioGroup options={aspectRatioOptions} value={aspectRatio} onChange={setAspectRatio} />
              </Popup>
            )}
          </SettingIcon>
        </div>
      </div>

      {/* Clean carousel - no buttons inside */}
      <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
        <div className="w-full max-w-[340px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[480px]" style={{ aspectRatio: baseAspectRatio, containerType: 'inline-size' }}>
          <div className="overflow-hidden w-full h-full rounded-2xl" ref={emblaRef}>
            <div className="flex h-full">
              {nodeSlides.map((slide, i) => (
                <div key={i} className="min-w-0 flex-[0_0_100%] h-full flex items-center justify-center">
                  <div className="w-full h-full bg-bg-elevated border border-border/40 rounded-2xl shadow-lg flex flex-col p-4 sm:p-7 relative" style={{ fontSize: baseFontSize, fontFamily: baseFontFamily, lineHeight: baseLineHeight, letterSpacing: baseLetterSpacing }}>
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0" style={{ fontFamily: baseFontFamily, letterSpacing: baseLetterSpacing }}>
                      {/* Module + Node title (first slide only) */}
                      {slide.slideIndex === 0 && (
                        <div className="mb-5 w-full" style={{ fontFamily: baseFontFamily, letterSpacing: baseLetterSpacing }}>
                          <p className="text-[0.65em] text-muted/70 font-semibold uppercase mb-1.5" style={{ letterSpacing: "0.15em" }}>{module.title}</p>
                          <h1 className="text-[1.4em] font-bold text-fg leading-[1.15]">
                            {slide.nodeLabel}
                          </h1>
                        </div>
                      )}

                      {/* Content only - no buttons */}
                      <div className="overflow-y-auto min-h-0 w-full">
                        <p style={{ color: "rgba(255,255,255,0.85)" }}>
                          {slide.content}
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-medium text-muted-dark">
                        {i + 1}/{nodeSlides.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fixed nav/action bar */}
      <div className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 pb-2">
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-border/60 rounded-xl px-3 py-2 shadow-lg">
          <button
            onClick={() => router.push(`/models/${slug}`)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg bg-bg-elevated border border-border/40 text-muted hover:text-fg hover:border-border/70 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-2.5 h-2.5" />
            Back
          </button>

          <NotebookSlide
            moduleSlug={slug}
            nodeId={nodeId}
            nodeLabel={currentSlide?.nodeLabel ?? ""}
            slideIndex={currentSlide?.slideIndex ?? 0}
            slideContent={currentSlide?.content ?? ""}
          />

          {selectedIndex > 0 && (
            <button
              onClick={scrollPrev}
              className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-bg-elevated border border-border/40 text-muted hover:text-fg hover:border-border/70 transition-all cursor-pointer"
            >
              Prev
            </button>
          )}

          {selectedIndex < nodeSlides.length - 1 ? (
            <button
              onClick={scrollNext}
              className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-bg-elevated border border-border/40 text-muted hover:text-fg hover:border-border/70 transition-all cursor-pointer"
            >
              Next
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push(`/models/${slug}/quiz/${nodeId}`)}
                className="px-2 py-1 text-[10px] font-medium rounded-lg bg-bg-elevated border border-border/40 text-muted hover:text-fg hover:border-border/70 transition-all cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-2.5 h-2.5" />
                Quiz
              </button>
              <button
                onClick={() => router.push(`/models/${slug}/reflection/${nodeId}`)}
                className="px-2 py-1 text-[10px] font-medium rounded-lg bg-bg-elevated border border-border/40 text-muted hover:text-fg hover:border-border/70 transition-all cursor-pointer flex items-center gap-1"
              >
                <MessageSquare className="w-2.5 h-2.5" />
                Reflect
              </button>
              <button
                onClick={handleDone}
                className="px-3 py-1 text-[10px] font-medium rounded-lg bg-fg text-bg hover:opacity-90 transition-all cursor-pointer"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
