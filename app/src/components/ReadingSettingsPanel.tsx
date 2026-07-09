"use client";

import { fontSizes, fontFamilies, lineHeights, letterSpacings, fontFamilyMap, type ReadingPrefs } from "@/contexts/ReadingContext";

interface ReadingSettingsPanelProps {
  readingSettings: ReadingPrefs;
  onChange: (settings: Partial<ReadingPrefs>) => void;
}

const defaults: ReadingPrefs = {
  fontSize: "md",
  fontFamily: "inter",
  lineHeight: "normal",
  letterSpacing: "normal",
};

export default function ReadingSettingsPanel({ readingSettings, onChange }: ReadingSettingsPanelProps) {
  return (
    <div className="px-4 py-4">
      {/* Font Size */}
      <div className="mb-3">
        <label className="text-[0.65rem] font-semibold mb-1.5 block text-muted">Font Size</label>
        <div className="grid grid-cols-4 gap-1.5">
          {fontSizes.map((f) => (
            <button key={f.key} onClick={() => onChange({ fontSize: f.key })}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                readingSettings.fontSize === f.key ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
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
            <button key={f.key} onClick={() => onChange({ fontFamily: f.key })}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                readingSettings.fontFamily === f.key ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
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
            <button key={l.key} onClick={() => onChange({ lineHeight: l.key })}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                readingSettings.lineHeight === l.key ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
              }`}
            >{l.label}</button>
          ))}
        </div>
      </div>

      {/* Letter Spacing */}
      <div>
        <label className="text-[0.65rem] font-semibold mb-1.5 block text-muted">Letter Spacing</label>
        <div className="grid grid-cols-3 gap-1.5">
          {letterSpacings.map((m) => (
            <button key={m.key} onClick={() => onChange({ letterSpacing: m.key })}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                readingSettings.letterSpacing === m.key ? "bg-accent text-white" : "bg-bg-elevated text-fg border border-border"
              }`}
            >{m.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
