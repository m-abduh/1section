"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface ReadingPrefs {
  fontSize: "sm" | "md" | "lg" | "xl";
  fontFamily: "inter" | "serif" | "mono" | "outfit";
  lineHeight: "tight" | "normal" | "relaxed";
  letterSpacing: "narrow" | "normal" | "wide";
}

export const fontSizeMap: Record<string, string> = {
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
};

export const lineHeightMap: Record<string, string> = {
  tight: "1.5",
  normal: "1.8",
  relaxed: "2.2",
};

export const fontFamilyMap: Record<string, string> = {
  inter: "'Inter', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', monospace",
  outfit: "'Outfit', sans-serif",
};

export const letterSpacingMap: Record<string, string> = {
  narrow: "0em",
  normal: "0.02em",
  wide: "0.05em",
};

export const fontSizes: { key: ReadingPrefs["fontSize"]; label: string }[] = [
  { key: "sm", label: "Small" },
  { key: "md", label: "Medium" },
  { key: "lg", label: "Large" },
  { key: "xl", label: "X-Large" },
];

export const fontFamilies: { key: ReadingPrefs["fontFamily"]; label: string }[] = [
  { key: "inter", label: "Inter" },
  { key: "serif", label: "Serif" },
  { key: "mono", label: "Mono" },
  { key: "outfit", label: "Outfit" },
];

export const lineHeights: { key: ReadingPrefs["lineHeight"]; label: string }[] = [
  { key: "tight", label: "Tight" },
  { key: "normal", label: "Normal" },
  { key: "relaxed", label: "Relaxed" },
];

export const letterSpacings: { key: ReadingPrefs["letterSpacing"]; label: string }[] = [
  { key: "narrow", label: "Narrow" },
  { key: "normal", label: "Normal" },
  { key: "wide", label: "Wide" },
];

interface ReadingContextValue {
  readingPrefs: ReadingPrefs;
  setReadingPrefs: (prefs: ReadingPrefs) => void;
  tocOpen: boolean;
  setTocOpen: (open: boolean) => void;
}

const defaultReadingPrefs: ReadingPrefs = {
  fontSize: "md",
  fontFamily: "inter",
  lineHeight: "normal",
  letterSpacing: "normal",
};

const ReadingContext = createContext<ReadingContextValue | null>(null);

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [readingPrefs, setReadingPrefs] = useState<ReadingPrefs>(defaultReadingPrefs);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("readingPrefs");
    if (saved) {
      try { setReadingPrefs(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("readingPrefs", JSON.stringify(readingPrefs));
  }, [readingPrefs]);

  return (
    <ReadingContext.Provider value={{ readingPrefs, setReadingPrefs, tocOpen, setTocOpen }}>
      {children}
    </ReadingContext.Provider>
  );
}

export function useReading() {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error("useReading must be used within ReadingProvider");
  return ctx;
}
