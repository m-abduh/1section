"use client";

import { useReading, type ReadingPrefs } from "@/contexts/ReadingContext";
import { RotateCcw } from "lucide-react";
import ReadingSettingsPanel from "./ReadingSettingsPanel";

interface Props {
  show: boolean;
  onClose: () => void;
}

const defaults: ReadingPrefs = {
  fontSize: "md",
  fontFamily: "inter",
  lineHeight: "normal",
  letterSpacing: "normal",
};

export default function ReadingSettingsPopup({ show, onClose }: Props) {
  const { readingPrefs, setReadingPrefs } = useReading();

  const update = (partial: Partial<ReadingPrefs>) => {
    setReadingPrefs({ ...readingPrefs, ...partial });
  };

  const hasChanges = (Object.keys(defaults) as (keyof ReadingPrefs)[]).some(
    (k) => readingPrefs[k] !== defaults[k]
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md rounded-t-2xl p-6 shadow-2xl bg-bg-card border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-fg">Reading Settings</h3>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={() => setReadingPrefs(defaults)}
                className="p-1.5 rounded-lg text-muted-dark hover:text-fg hover:bg-bg-elevated transition-all"
                title="Reset to defaults"
              >
                <RotateCcw size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-fg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <ReadingSettingsPanel readingSettings={readingPrefs} onChange={update} />
      </div>
    </div>
  );
}
