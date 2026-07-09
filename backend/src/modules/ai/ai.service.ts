import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { slugify } from "../../lib/transform";
import { generateModulePrompt, generateQuestionsPrompt, generateGraphPrompt } from "./prompts";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface ParsedNode {
  id?: string;
  positionX?: number;
  positionY?: number;
  label?: string;
  type?: string;
  description?: string;
  content?: string[];
}

interface ParsedEdge {
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

interface ParsedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MAX_RETRIES = 2;

async function callGemini(prompt: string, maxTokens = 8192): Promise<string> {
  if (!env.gemini.apiKey) {
    throw new AppError("API key AI belum dikonfigurasi di .env", 500);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const wait = 2000 * attempt;
      console.log(`[AI] Retry ${attempt}/${MAX_RETRIES} in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.gemini.apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[AI] Gemini responded with status ${res.status}:`, errText.slice(0, 500));

        let geminiMsg = "";
        try {
          const errJson = JSON.parse(errText);
          geminiMsg = errJson?.error?.message || "";
        } catch { /* ignore */ }

        if (res.status === 400) {
          const detail = geminiMsg ? `: ${geminiMsg}` : " — mungkin konten tidak sesuai safety filter";
          throw new AppError(`Permintaan ke AI ditolak${detail}`, 502);
        }
        if (res.status === 403) {
          throw new AppError("API key AI tidak valid atau tidak memiliki akses", 502);
        }
        if (res.status === 429) {
          throw new AppError("Server AI sedang sibuk (rate limit), coba lagi nanti", 429);
        }
        if (res.status >= 500) {
          const detail = geminiMsg ? `: ${geminiMsg}` : "";
          throw new AppError(`Server AI mengalami gangguan${detail}`, 502);
        }
        const detail = geminiMsg ? `: ${geminiMsg}` : "";
        throw new AppError(`Gagal menghubungi server AI (${res.status})${detail}`, 502);
      }

      const data = (await res.json()) as GeminiResponse;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new AppError("Server AI tidak mengembalikan konten", 502);

      return text;
    } catch (err: unknown) {
      const err_ = err instanceof Error ? err : new Error(String(err));
      clearTimeout(timeout);
      lastError = err_;

      if (err_ instanceof AppError) {
        if (err_.statusCode === 429 || err_.statusCode >= 500) {
          if (attempt < MAX_RETRIES) continue;
          throw err_;
        }
        if (err_.statusCode === 504) throw err_;
        throw err_;
      }

      const isTimeout =
        err_.name === "AbortError" ||
        (err_ as { code?: string }).code === "UND_ERR_CONNECT_TIMEOUT" ||
        (err_ as { cause?: { code?: string } }).cause?.code === "UND_ERR_CONNECT_TIMEOUT";

      if (isTimeout) {
        if (attempt < MAX_RETRIES) continue;
        throw new AppError("Koneksi ke server AI timeout, coba lagi nanti", 504);
      }

      throw new AppError("Gagal terhubung ke server AI, periksa koneksi internet", 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new AppError("Gagal menghasilkan konten AI", 502);
}

/** Fallback JSON parser for small blocks (questions, graph, etc.) */
function extractJson(text: string): ParsedQuestion[] | { nodes: ParsedNode[]; edges: ParsedEdge[] } | null {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let raw = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try { return JSON.parse(raw); } catch { /* fall through */ }

  raw = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
    .replace(/,(\s*[}\]])/g, "$1");

  try { return JSON.parse(raw); } catch { return null; }
}

/** Parse delimiter-based response from Gemini */
function parseResponse(raw: string) {
  const getSection = (start: string, end: string): string => {
    const s = raw.indexOf(start);
    if (s === -1) return "";
    const from = s + start.length;
    const e = end ? raw.indexOf(end, from) : raw.length;
    return (e === -1 ? raw.slice(from) : raw.slice(from, e)).trim();
  };

  let title = getSection("###TITLE###", "###DESC###");
  const description = getSection("###DESC###", "###NODES###");
  const content = "";
  const nodesRaw = getSection("###NODES###", "###EDGES###");
  const edgesRaw = getSection("###EDGES###", "###QUESTIONS###");
  const questionsRaw = getSection("###QUESTIONS###", "");

  if (!title) {
    const firstLine = raw.split("\n").find((l) => l.trim().length > 0 && !l.startsWith("#"));
    if (firstLine) title = firstLine.trim();
  }

  let nodes: ParsedNode[] = [];
  let edges: ParsedEdge[] = [];
  let questions: ParsedQuestion[] = [];

  try { nodes = JSON.parse(nodesRaw || "[]"); } catch { nodes = []; }
  try { edges = JSON.parse(edgesRaw || "[]"); } catch { edges = []; }
  try { questions = JSON.parse(questionsRaw || "[]"); } catch { questions = []; }

  return { title, description, content, nodes, edges, questions };
}

export namespace AiService {
  export async function getCategoriesInfo() {
    const categories = await prisma.module.groupBy({
      by: ["category"],
      where: { isDraft: false },
      _count: { category: true },
      orderBy: { category: "asc" },
    });

    const titles = await prisma.module.findMany({
      where: { isDraft: false },
      select: { title: true, slug: true, category: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      categories: categories.map((c) => ({ name: c.category, count: c._count.category })),
      existingTitles: titles.map((t) => ({ title: t.title, slug: t.slug, category: t.category })),
    };
  }

  export async function autoGenerate(selectedCategory?: string) {
    const info = await getCategoriesInfo();
    const existingTitles = info.existingTitles.map((t) => t.title);

    let category: string;
    if (selectedCategory && info.categories.find((c) => c.name === selectedCategory)) {
      category = selectedCategory;
    } else {
      info.categories.sort((a, b) => a.count - b.count);
      category = info.categories[0]?.name || "mindset";
    }

    const prompt = generateModulePrompt(category, existingTitles);

    const raw = await callGemini(prompt, 8192);
    const parsed = parseResponse(raw);

    if (!parsed.title || !parsed.nodes?.length) {
      console.error("[AI] Parse failed. Raw:", raw.slice(0, 800));
      throw new AppError(`AI tidak menghasilkan konten yang valid (title:${!!parsed.title}, nodes:${!!parsed.nodes?.length})`, 502);
    }

    const slug = slugify(parsed.title);

    let finalSlug = slug;
    let counter = 1;
    while (await prisma.module.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const idSuffix = Math.random().toString(36).slice(2, 8);

    const module = await prisma.module.create({
      data: {
        slug: finalSlug,
        title: parsed.title,
        description: parsed.description || "",
        category,
        isPremium: true,
        isDraft: true,
        nodes: (parsed.nodes || []).length > 0
          ? (() => {
              const nodeList = parsed.nodes as ParsedNode[];
              const slugs = new Map<string, number>();
              const slugFrom = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
              return {
                create: nodeList.map((n: ParsedNode) => {
              const base = slugFrom(n.label || "node");
              const count = slugs.get(base) || 0;
              slugs.set(base, count + 1);
              const slug = count === 0 ? base : `${base}-${count}`;
              const description = n.description
                ? n.description
                : Array.isArray(n.content) && n.content[0]
                  ? n.content[0].length > 150
                    ? n.content[0].slice(0, 147) + "..."
                    : n.content[0]
                  : `Learn about ${n.label || "this concept"}`;
              return {
                id: `${n.id || "node"}-${idSuffix}`,
                positionX: n.positionX ?? 250,
                positionY: n.positionY ?? 150,
                label: n.label || "Node",
                type: n.type || "custom",
                slug,
                description,
                content: n.content ? JSON.stringify(n.content) : null,
              };
                }),
              };
            })()
          : undefined,
        edges: (parsed.edges || []).length > 0
          ? { create: (parsed.edges as ParsedEdge[]).map((e: ParsedEdge) => ({
              id: `edge-${idSuffix}-${e.source}-${e.target}`,
              source: `${e.source}-${idSuffix}`,
              target: `${e.target}-${idSuffix}`,
              label: e.label || "",
              animated: e.animated ?? true,
            }))}
          : undefined,
        questions: (parsed.questions || []).length > 0
          ? { create: (parsed.questions as ParsedQuestion[]).map((q: ParsedQuestion) => ({
              question: q.question || "",
              options: q.options || [],
              correctAnswer: q.correctAnswer ?? 0,
              explanation: q.explanation || "",
            }))}
          : undefined,
      },
    });

    return module;
  }

  export async function generate(mode: string, title?: string, description?: string, content?: string) {
    switch (mode) {
      case "questions": {
        const text = await callGemini(generateQuestionsPrompt(content, title), 2048);
        const parsed = extractJson(text);
        return { questions: Array.isArray(parsed) ? parsed : [] };
      }
      case "graph": {
        const text = await callGemini(generateGraphPrompt(content, title), 2048);
        const parsed = extractJson(text);
        const graphData = parsed && !Array.isArray(parsed) ? parsed : { nodes: [] as ParsedNode[], edges: [] as ParsedEdge[] };
        const nodes = graphData.nodes || [];
        const slugs = new Map<string, number>();
        const slugFrom = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
        return {
          nodes: nodes.map((n: ParsedNode) => {
            const base = slugFrom(n.label || "node");
            const count = slugs.get(base) || 0;
            slugs.set(base, count + 1);
            const description = n.description
              ? n.description
              : Array.isArray(n.content) && n.content[0]
                ? n.content[0].length > 150
                  ? n.content[0].slice(0, 147) + "..."
                  : n.content[0]
                : `Learn about ${n.label || "this concept"}`;
            return {
              id: n.id || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              positionX: n.positionX ?? 250,
              positionY: n.positionY ?? 150,
              label: n.label || "Node",
              type: n.type || "custom",
              slug: count === 0 ? base : `${base}-${count}`,
              description,
              content: n.content || undefined,
            };
          }),
          edges: (graphData.edges || []).map((e: ParsedEdge) => ({
            id: `edge-${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            label: e.label || "",
            animated: e.animated ?? true,
          })),
        };
      }
      default:
        throw new AppError("Mode tidak valid", 400);
    }
  }
}
