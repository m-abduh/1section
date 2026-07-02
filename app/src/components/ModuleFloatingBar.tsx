"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Square, Moon, Sun, Menu, Heart, Volume2, FastForward, FileDown, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useReading, fontSizes, fontFamilies, lineHeights, margins, fontFamilyMap, type ReadingPrefs } from "@/contexts/ReadingContext";

interface Props {
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number;
  durationInfo: any;
  voices: any[];
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  rate: number;
  onRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onSeeking: (pct: number) => void;
  onSeekEnd: () => void;
}

export default function ModuleFloatingBar({
  isPlaying,
  onTogglePlay,
  progress,
  durationInfo,
  voices,
  selectedVoice,
  onVoiceChange,
  rate,
  onRateChange,
  volume,
  onVolumeChange,
  isFavorited,
  onToggleFavorite,
  onSeeking,
  onSeekEnd,
}: Props) {
  const browserSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getProgressFromEvent = useRef((e: MouseEvent | React.MouseEvent) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!browserSupported) return;
    e.preventDefault();
    setIsDragging(true);
    const pct = getProgressFromEvent.current(e);
    onSeeking(pct);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const pct = getProgressFromEvent.current(e);
      onSeeking(pct);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      onSeekEnd();
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onSeeking, onSeekEnd]);

  const { theme, setTheme } = useTheme();
  const { tocOpen, setTocOpen } = useReading();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const [showReading, setShowReading] = useState(false);
  const { readingPrefs, setReadingPrefs } = useReading();
  const defaults: ReadingPrefs = { fontSize: "md", fontFamily: "inter", lineHeight: "normal", margin: "normal" };
  const updateReading = (partial: Partial<ReadingPrefs>) => setReadingPrefs({ ...readingPrefs, ...partial });
  const handleDownloadPdf = () => {
    const article = document.querySelector("article");
    if (!article) return;
    const pageTitle = document.querySelector("h1")?.textContent || document.title;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head><title>${pageTitle} - 1section.com</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 0 auto; padding: 0; color: #111; line-height: 1.8; font-size: 14px; background: #fff !important; }
          img { max-width: 100%; height: auto; }
          h1 { font-size: 1.75em; margin-bottom: 0.5em; font-weight: 700; page-break-after: avoid; }
          h2 { font-size: 1.35em; margin-top: 1.5em; font-weight: 600; page-break-after: avoid; }
          h3 { font-size: 1.15em; margin-top: 1.25em; font-weight: 600; page-break-after: avoid; }
          p, li { margin: 0.5em 0; font-size: 14px; page-break-inside: avoid; }
          * { color: #111 !important; background: transparent !important; }
        </style>
      </head>
      <body>${article.innerHTML}</body>
      </html>
    `);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
    }, 300);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[2000] px-4 pointer-events-none" style={{ paddingBottom: "16px" }}>
        <div className="pointer-events-auto w-full max-w-xl mx-auto rounded-2xl shadow-2xl border backdrop-blur-xl bg-bg-overlay border-border">
          {/* Progress bar & timer (ABOVE buttons) */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div
                  ref={progressBarRef}
                  onMouseDown={handleMouseDown}
                  className="relative h-1.5 bg-border rounded-full mx-4 mt-3 mb-1 cursor-pointer group"
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-fg group-hover:bg-fg/80 transition-colors"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-fg border-2 border-bg shadow-md transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ left: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between px-4 pb-1">
                  <span className="text-[0.65rem] tabular-nums text-muted-dark">
                    {durationInfo.currentFormatted(progress)}
                  </span>
                  <span className="text-[0.65rem] tabular-nums text-muted-dark">
                    {durationInfo.totalFormatted}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls row */}
          <div className="flex items-center justify-around px-3 py-3">
            <button
              onClick={browserSupported ? onTogglePlay : undefined}
              disabled={!browserSupported}
              title={!browserSupported ? 'Audio narration not supported in this browser' : undefined}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer text-muted bg-bg-elevated border-border ${browserSupported ? 'border' : 'border border-dashed opacity-40 cursor-not-allowed'}`}
            >
              {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer text-muted bg-bg-elevated border border-border hover:text-fg hover:border-border-light">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={theme} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.5, opacity: 0 }} transition={{ duration: 0.3 }}>
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </motion.div>
              </AnimatePresence>
            </button>
            <button onClick={() => setShowReading((v) => !v)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer border ${showReading ? "text-fg bg-bg-elevated border-border-light" : "text-muted bg-bg-elevated border-border"}`}>
              <span className="text-xs font-bold">Aa</span>
            </button>
            <button onClick={() => setTocOpen(true)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer text-muted bg-bg-elevated border border-border">
              <Menu size={16} />
            </button>
            <button onClick={onToggleFavorite} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer bg-bg-elevated border border-border ${isFavorited ? "text-red-500" : "text-muted"}`}>
              <Heart size={16} className={isFavorited ? "fill-red-500" : "fill-none"} />
            </button>
            <button onClick={handleDownloadPdf} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer text-muted bg-bg-elevated border border-border hover:text-fg hover:border-border-light">
              <FileDown size={16} />
            </button>
          </div>

          {/* Audio settings (below controls, visible only when playing) */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border-subtle px-4 py-3">
                <div className="mb-3">
                  <label className="text-[0.65rem] font-semibold mb-1.5 block text-muted">Voice</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {voices.map((voice: any) => (
                      <button
                        key={voice.name}
                        onClick={() => onVoiceChange(voice.name)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedVoice === voice.name ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
                        }`}
                      >
                        {voice.displayName}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 text-muted-dark">
                    <FastForward size={14} />
                    <select value={rate} onChange={(e) => onRateChange(parseFloat(e.target.value))} className="text-xs border-none cursor-pointer outline-none bg-transparent text-muted">
                      <option value="0.8">0.8x</option>
                      <option value="1">1.0x</option>
                      <option value="1.2">1.2x</option>
                      <option value="1.5">1.5x</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 size={14} className="text-muted-dark" />
                    <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => onVolumeChange(parseFloat(e.target.value))} className="w-[60px] h-0.5 cursor-pointer accent-fg" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Browser not supported banner */}
          {!browserSupported && (
            <div className="px-4 py-2.5 border-t border-border-subtle bg-amber-500/5">
              <p className="text-[0.7rem] text-amber-500 text-center font-medium">
                Audio narration is not supported in this browser. Try Chrome or Edge.
              </p>
            </div>
          )}

          {/* Reading settings (inline, toggle via Aa) */}
          <AnimatePresence>
            {showReading && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border-subtle">
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-fg">Reading Settings</h3>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setReadingPrefs(defaults)} className="p-1 rounded-lg text-muted-dark hover:text-fg hover:bg-bg-elevated transition-all cursor-pointer" title="Reset">
                        <RotateCcw size={13} />
                      </button>
                      <button onClick={() => setShowReading(false)} className="p-1 rounded-lg text-muted-dark hover:text-fg hover:bg-bg-elevated transition-all cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="mb-3">
                    <label className="text-[0.65rem] font-semibold mb-1.5 block text-muted">Font Size</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {fontSizes.map((f) => (
                        <button key={f.key} onClick={() => updateReading({ fontSize: f.key })}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            readingPrefs.fontSize === f.key ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
                          }`}
                        >{f.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="mb-3">
                    <label className="text-[0.65rem] font-semibold mb-1.5 block text-muted">Font Family</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {fontFamilies.map((f) => (
                        <button key={f.key} onClick={() => updateReading({ fontFamily: f.key })}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            readingPrefs.fontFamily === f.key ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
                          }`}
                          style={{ fontFamily: fontFamilyMap[f.key] }}
                        >{f.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Line Height */}
                  <div className="mb-3">
                    <label className="text-[0.65rem] font-semibold mb-1.5 block text-muted">Line Height</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {lineHeights.map((l) => (
                        <button key={l.key} onClick={() => updateReading({ lineHeight: l.key })}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            readingPrefs.lineHeight === l.key ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
                          }`}
                        >{l.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Letter Spacing */}
                  <div>
                    <label className="text-[0.65rem] font-semibold mb-1.5 block text-muted">Letter Spacing</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {margins.map((m) => (
                        <button key={m.key} onClick={() => updateReading({ margin: m.key })}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            readingPrefs.margin === m.key ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
                          }`}
                        >{m.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


        </div>
      </div>
    </>
  );
}
