"use client";

import { useReading, type ReadingPrefs, fontSizes, fontFamilies, lineHeights, margins, fontFamilyMap } from "@/contexts/ReadingContext";
import { RotateCcw } from "lucide-react";

interface Props {
  show: boolean;
  onClose: () => void;
}

const defaults: ReadingPrefs = {
  fontSize: "md",
  fontFamily: "inter",
  lineHeight: "normal",
  margin: "normal",
};

export default function ReadingSettingsPopup({ show, onClose }: Props) {
  const { readingPrefs, setReadingPrefs } = useReading();

  const update = (partial: Partial<ReadingPrefs>) => {
    setReadingPrefs({ ...readingPrefs, ...partial });
  };

  const hasChanges = Object.keys(defaults).some((k) => (readingPrefs as any)[k] !== (defaults as any)[k]);

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

        {/* Font Size */}
        <div className="mb-5">
          <label className="text-xs font-semibold mb-2 block text-muted">Font Size</label>
          <div className="grid grid-cols-4 gap-2">
            {fontSizes.map((f) => (
              <button
                key={f.key}
                onClick={() => update({ fontSize: f.key })}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  readingPrefs.fontSize === f.key
                    ? "bg-accent text-white"
                    : "bg-bg-elevated text-fg border border-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div className="mb-5">
          <label className="text-xs font-semibold mb-2 block text-muted">Font Family</label>
          <div className="grid grid-cols-4 gap-2">
            {fontFamilies.map((f) => (
              <button
                key={f.key}
                onClick={() => update({ fontFamily: f.key })}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  readingPrefs.fontFamily === f.key
                    ? "bg-accent text-white"
                    : "bg-bg-elevated text-fg border border-border"
                }`}
                style={{ fontFamily: fontFamilyMap[f.key] }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Line Height */}
        <div className="mb-5">
          <label className="text-xs font-semibold mb-2 block text-muted">Line Height</label>
          <div className="grid grid-cols-3 gap-2">
            {lineHeights.map((l) => (
              <button
                key={l.key}
                onClick={() => update({ lineHeight: l.key })}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  readingPrefs.lineHeight === l.key
                    ? "bg-accent text-white"
                    : "bg-bg-elevated text-fg border border-border"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Margin */}
        <div>
          <label className="text-xs font-semibold mb-2 block text-muted">Letter Spacing</label>
          <div className="grid grid-cols-3 gap-2">
            {margins.map((m) => (
              <button
                key={m.key}
                onClick={() => update({ margin: m.key })}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  readingPrefs.margin === m.key
                    ? "bg-accent text-white"
                    : "bg-bg-elevated text-fg border border-border"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
