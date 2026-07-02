export interface ModuleProgress {
  slug: string;
  readingProgress: number;
  scrollPosition: number;
  listeningProgress: number;
  currentCharIndex: number;
  audioRate: number;
  lastReadAt: number;
}

const STORAGE_KEY = "1section_progress_v3";

function getAllProgress(): Record<string, ModuleProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function defaults(slug: string): ModuleProgress {
  return {
    slug,
    readingProgress: 0,
    scrollPosition: 0,
    listeningProgress: 0,
    currentCharIndex: 0,
    audioRate: 1,
    lastReadAt: Date.now(),
  };
}

export function getModuleProgress(slug: string): ModuleProgress | null {
  const all = getAllProgress();
  return all[slug] || null;
}

export function saveModuleProgress(
  slug: string,
  data: Partial<ModuleProgress>
) {
  const all = getAllProgress();
  all[slug] = Object.assign(defaults(slug), all[slug], data, {
    lastReadAt: Date.now(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getContinueLearning(): ModuleProgress[] {
  const all = getAllProgress();
  return Object.values(all)
    .filter((p) => p.readingProgress > 0 || p.listeningProgress > 0)
    .sort((a, b) => b.lastReadAt - a.lastReadAt);
}


