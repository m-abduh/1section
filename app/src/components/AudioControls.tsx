"use client";

import { useRef, useState, useEffect } from "react";
import { FastForward, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { DurationInfo, VoiceInfo } from "@/hooks/useTTS";

interface Props {
  isPlaying: boolean;
  progress: number;
  durationInfo: DurationInfo;
  voices: VoiceInfo[];
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  rate: number;
  onRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onSeeking: (pct: number) => void;
  onSeekEnd: () => void;
}

export default function AudioControls({
  isPlaying,
  progress,
  durationInfo,
  voices,
  selectedVoice,
  onVoiceChange,
  rate,
  onRateChange,
  volume,
  onVolumeChange,
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

  return (
    <>
      {/* Progress bar & timer */}
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

      {/* Audio settings (voice, rate, volume) */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border-subtle px-4 py-3">
            <div className="mb-3">
              <label className="text-[0.65rem] font-semibold mb-1.5 block text-muted">Voice</label>
              <div className="grid grid-cols-4 gap-1.5">
                {voices.map((voice: VoiceInfo) => (
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
    </>
  );
}
