"use client";

import { useState } from "react";
import { Play, Square, Menu, Heart, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useReading, type ReadingPrefs } from "@/contexts/ReadingContext";
import AudioControls from "./AudioControls";
import ThemeToggle from "./ThemeToggle";
import PdfDownloadButton from "./PdfDownloadButton";
import ReadingSettingsPanel from "./ReadingSettingsPanel";

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

const defaults: ReadingPrefs = {
  fontSize: "md",
  fontFamily: "inter",
  lineHeight: "normal",
  letterSpacing: "normal",
};

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
  const { tocOpen, setTocOpen } = useReading();
  const { readingPrefs, setReadingPrefs } = useReading();
  const [showReading, setShowReading] = useState(false);

  const updateReading = (partial: Partial<ReadingPrefs>) =>
    setReadingPrefs({ ...readingPrefs, ...partial });

  const hasChanges = Object.keys(defaults).some(
    (k) => (readingPrefs as any)[k] !== (defaults as any)[k]
  );

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[2000] px-4 pointer-events-none" style={{ paddingBottom: "16px" }}>
        <div className="pointer-events-auto w-full max-w-xl mx-auto rounded-2xl shadow-2xl border backdrop-blur-xl bg-bg-overlay border-border">
          {/* Progress bar & timer + audio settings */}
          <AudioControls
            isPlaying={isPlaying}
            progress={progress}
            durationInfo={durationInfo}
            voices={voices}
            selectedVoice={selectedVoice}
            onVoiceChange={onVoiceChange}
            rate={rate}
            onRateChange={onRateChange}
            volume={volume}
            onVolumeChange={onVolumeChange}
            onSeeking={onSeeking}
            onSeekEnd={onSeekEnd}
          />

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

            <ThemeToggle />

            <button
              onClick={() => setShowReading((v) => !v)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer border ${showReading ? "text-fg bg-bg-elevated border-border-light" : "text-muted bg-bg-elevated border-border"}`}
            >
              <span className="text-xs font-bold">Aa</span>
            </button>

            <button
              onClick={() => setTocOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer text-muted bg-bg-elevated border border-border"
            >
              <Menu size={16} />
            </button>

            <button
              onClick={onToggleFavorite}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer bg-bg-elevated border border-border ${isFavorited ? "text-red-500" : "text-muted"}`}
            >
              <Heart size={16} className={isFavorited ? "fill-red-500" : "fill-none"} />
            </button>

            <PdfDownloadButton />
          </div>

          {/* Reading settings (inline) */}
          <AnimatePresence>
            {showReading && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-border-subtle"
              >
                <div className="flex items-center justify-between px-4 pt-4">
                  <h3 className="text-xs font-bold text-fg">Reading Settings</h3>
                  <div className="flex items-center gap-1">
                    {hasChanges && (
                      <button
                        onClick={() => setReadingPrefs(defaults)}
                        className="p-1 rounded-lg text-muted-dark hover:text-fg hover:bg-bg-elevated transition-all cursor-pointer"
                        title="Reset"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => setShowReading(false)}
                      className="p-1 rounded-lg text-muted-dark hover:text-fg hover:bg-bg-elevated transition-all cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                <ReadingSettingsPanel readingSettings={readingPrefs} onChange={updateReading} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
