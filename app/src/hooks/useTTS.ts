"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";

export interface VoiceInfo {
  name: string;
  displayName: string;
  original: SpeechSynthesisVoice;
}

export interface DurationInfo {
  totalSeconds: number;
  totalFormatted: string;
  currentFormatted: (p: number) => string;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export function useTTS(text: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const textRef = useRef(text);
  const progressRef = useRef(progress);
  const charIndexRef = useRef(currentCharIndex);
  const volumeRef = useRef(volume);
  const rateRef = useRef(rate);
  const voiceRef = useRef(selectedVoice);

  textRef.current = text;
  progressRef.current = progress;
  charIndexRef.current = currentCharIndex;
  volumeRef.current = volume;
  rateRef.current = rate;
  voiceRef.current = selectedVoice;

  useEffect(() => {
    if (typeof window !== "undefined" && !synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const synth = synthRef.current;

  const durationInfo = useMemo((): DurationInfo => {
    const words = text.split(/\s+/).length;
    const totalSecs = Math.ceil(words / (2.5 * rate));
    return {
      totalSeconds: totalSecs,
      totalFormatted: formatTime(totalSecs),
      currentFormatted: (p: number) => formatTime(Math.floor((p / 100) * totalSecs)),
    };
  }, [text, rate]);

  const loadVoices = useCallback(() => {
    if (!synth) return;
    const all = synth.getVoices();
    const priority = ["William", "Aria", "Guy", "Jenny", "Ryan", "Sonia", "Andrew", "Ava"];
    const matched: VoiceInfo[] = [];
    for (const name of priority) {
      const found = all.find((v) => v.lang.startsWith("en") && v.name.includes(name));
      if (found) matched.push({ name: found.name, displayName: name, original: found });
    }
    if (matched.length === 0) {
      const first = all.find((v) => v.lang.startsWith("en"));
      if (first) matched.push({ name: first.name, displayName: first.name, original: first });
    }
    setVoices(matched);
    if (matched.length > 0 && selectedVoice === "") {
      setSelectedVoice(matched[0].name);
    }
  }, [synth, selectedVoice]);

  useEffect(() => {
    if (!synth) return;
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, [synth, loadVoices]);

  useEffect(() => {
    return () => {
      synth?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [synth]);

  const speak = useCallback(
    (startIdx: number, vol: number, spd: number, voiceName: string) => {
      if (!synth) return;
      synth.cancel();
      if (timerRef.current) clearInterval(timerRef.current);

      const fullText = textRef.current;
      const remaining = fullText.slice(startIdx);
      if (remaining.length === 0) return;

      const utterance = new SpeechSynthesisUtterance(remaining);
      utterance.lang = "en-US";
      const vw = voices.find((v) => v.name === voiceName);
      if (vw) utterance.voice = vw.original;
      utterance.volume = vol;
      utterance.rate = spd;

      startTimeRef.current = Date.now();
      const totalSecs = durationInfo.totalSeconds;

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const estPct = elapsed / (totalSecs * 1000) * 100;
        if (estPct > progressRef.current + 0.5) {
          const idx = Math.floor((estPct / 100) * fullText.length);
          const globalIdx = startIdx + Math.min(idx, remaining.length - 1);
          if (globalIdx > charIndexRef.current) {
            setCurrentCharIndex(globalIdx);
            setProgress(Math.min(estPct, 99));
          }
        }
      }, 150);

      utterance.onboundary = (event) => {
        const globalIdx = startIdx + (event.charIndex || 0);
        if (globalIdx > charIndexRef.current) {
          const pct = Math.min((globalIdx / fullText.length) * 100, 99.5);
          setCurrentCharIndex(globalIdx);
          setProgress(pct);
        }
      };

      utterance.onend = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setCurrentCharIndex(0);
        setProgress(0);
        setIsPlaying(false);
      };

      utterance.onerror = (event) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (event.error !== "canceled" && event.error !== "interrupted") {
          setIsPlaying(false);
        }
      };

      synth.speak(utterance);
      setIsPlaying(true);
    },
    [synth, voices, durationInfo.totalSeconds],
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      synth?.cancel();
      setIsPlaying(false);
    } else {
      const p = progressRef.current;
      const idx = p > 0 && p < 100
        ? Math.floor((p / 100) * textRef.current.length)
        : 0;
      speak(idx, volumeRef.current, rateRef.current, voiceRef.current);
    }
  }, [isPlaying, synth, speak]);

  const seek = useCallback((pct: number) => {
    const fullText = textRef.current;
    const idx = Math.floor((pct / 100) * fullText.length);
    setCurrentCharIndex(idx);
    charIndexRef.current = idx;
    setProgress(pct);
    progressRef.current = pct;
  }, []);

  const seekEnd = useCallback(() => {
    if (isPlaying) {
      const p = progressRef.current;
      if (p > 0 && p < 100) {
        const idx = Math.floor((p / 100) * textRef.current.length);
        synth?.cancel();
        speak(idx, volumeRef.current, rateRef.current, voiceRef.current);
      }
    }
  }, [isPlaying, synth, speak]);

  const updateRate = useCallback(
    (r: number) => {
      setRate(r);
      rateRef.current = r;
      if (isPlaying) {
        const idx = Math.floor((progressRef.current / 100) * textRef.current.length);
        synth?.cancel();
        speak(idx, volumeRef.current, r, voiceRef.current);
      }
    },
    [isPlaying, synth, speak],
  );

  const updateVolume = useCallback(
    (v: number) => {
      setVolume(v);
      volumeRef.current = v;
      if (isPlaying) {
        const idx = Math.floor((progressRef.current / 100) * textRef.current.length);
        synth?.cancel();
        speak(idx, v, rateRef.current, voiceRef.current);
      }
    },
    [isPlaying, synth, speak],
  );

  const updateVoice = useCallback(
    (name: string) => {
      setSelectedVoice(name);
      voiceRef.current = name;
      if (isPlaying) {
        const idx = Math.floor((progressRef.current / 100) * textRef.current.length);
        synth?.cancel();
        speak(idx, volumeRef.current, rateRef.current, name);
      }
    },
    [isPlaying, synth, speak],
  );

  const getSnapshot = useCallback(() => ({
    progress: progressRef.current,
    currentCharIndex: charIndexRef.current,
    rate: rateRef.current,
  }), []);

  return {
    isPlaying,
    progress,
    currentCharIndex,
    voices,
    selectedVoice,
    volume,
    rate,
    durationInfo,
    togglePlay,
    seek,
    seekEnd,
    setRate: updateRate,
    setVolume: updateVolume,
    setVoice: updateVoice,
    loadVoices,
    getSnapshot,
  };
}
