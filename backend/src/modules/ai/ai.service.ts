import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { slugify } from "../../lib/transform";
import { generateModulePrompt, generateQuestionsPrompt, generateGraphPrompt } from "./prompts";

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
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

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_RETRIES = 2;

async function callAI(prompt: string, maxTokens = 16384): Promise<string> {
  if (!env.ai.apiKey) {
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
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.ai.apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.8,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[AI] Groq responded with status ${res.status}:`, errText.slice(0, 500));

        let aiMsg = "";
        try {
          const errJson = JSON.parse(errText);
          aiMsg = errJson?.error?.message || "";
        } catch { /* ignore */ }

        if (res.status === 400) {
          const detail = aiMsg ? `: ${aiMsg}` : " — mungkin konten tidak sesuai";
          throw new AppError(`Permintaan ke AI ditolak${detail}`, 502);
        }
        if (res.status === 401 || res.status === 403) {
          throw new AppError("API key AI tidak valid atau tidak memiliki akses", 502);
        }
        if (res.status === 429) {
          throw new AppError("Server AI sedang sibuk (rate limit), coba lagi nanti", 429);
        }
        if (res.status === 413) {
          const detail = aiMsg ? `: ${aiMsg}` : " — request terlalu besar untuk model ini";
          throw new AppError(`Request AI terlalu besar${detail}`, 502);
        }
        if (res.status >= 500) {
          const detail = aiMsg ? `: ${aiMsg}` : "";
          throw new AppError(`Server AI mengalami gangguan${detail}`, 502);
        }
        const detail = aiMsg ? `: ${aiMsg}` : "";
        throw new AppError(`Gagal menghubungi server AI (${res.status})${detail}`, 502);
      }

      const data = (await res.json()) as GroqResponse;
      const text = data?.choices?.[0]?.message?.content;
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

/** Extract all JSON arrays from text using balanced bracket matching */
function extractAllJsonArrays(text: string): any[][] {
  const results: any[][] = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const start = text.indexOf('[', searchFrom);
    if (start === -1) break;
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end === -1) break;
    try {
      const parsed = JSON.parse(text.slice(start, end));
      if (Array.isArray(parsed) && parsed.length > 0) results.push(parsed);
    } catch { /* skip malformed */ }
    searchFrom = end;
  }
  return results;
}

/** Extract all complete JSON objects from text */
function extractAllJsonObjects(text: string): Record<string, any>[] {
  const results: Record<string, any>[] = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const start = text.indexOf('{', searchFrom);
    if (start === -1) break;
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end === -1) break;
    try {
      const parsed = JSON.parse(text.slice(start, end));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) results.push(parsed);
    } catch { /* skip malformed */ }
    searchFrom = end;
  }
  return results;
}

/** Extract single JSON object from text */
function extractJsonObject(text: string): Record<string, any> | null {
  const objs = extractAllJsonObjects(text);
  return objs.length > 0 ? objs[0] : null;
}

/** Repair truncated JSON array — finds the first [ and closes it after the last complete object */
function repairTruncatedArray(text: string): any[] | null {
  const arrStart = text.indexOf('[');
  if (arrStart === -1) return null;
  const objects = extractAllJsonObjects(text.slice(arrStart));
  if (objects.length === 0) return null;
  // Try to reconstruct: wrap found objects back into an array
  const json = JSON.stringify(objects);
  try { return JSON.parse(json); } catch { return objects; }
}

function hasField(obj: any, field: string): boolean {
  return obj && typeof obj === 'object' && !Array.isArray(obj) && field in obj;
}

/** Classify extracted arrays into nodes, edges, questions */
function classifyArrays(arrays: any[][]): { nodes: any[]; edges: any[]; questions: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  const questions: any[] = [];
  for (const arr of arrays) {
    if (arr.length === 0) continue;
    const sample = arr[0];
    if (!sample || typeof sample !== 'object') continue;
    if (hasField(sample, 'source') || hasField(sample, 'target')) {
      edges.push(...arr);
    } else if (hasField(sample, 'question') || hasField(sample, 'options') || hasField(sample, 'correctAnswer')) {
      questions.push(...arr);
    } else if (hasField(sample, 'id') || hasField(sample, 'label') || hasField(sample, 'content')) {
      nodes.push(...arr);
    } else {
      nodes.push(...arr);
    }
  }
  return { nodes, edges, questions };
}

/** Parse delimiter-based response from AI */
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

  const parseOrFallback = <T>(section: string): T[] => {
    try { return JSON.parse(section || "[]"); } catch { return []; }
  };

  nodes = parseOrFallback<ParsedNode>(nodesRaw);
  edges = parseOrFallback<ParsedEdge>(edgesRaw);
  questions = parseOrFallback<ParsedQuestion>(questionsRaw);

  // Fallback chain if any section is empty
  if (nodes.length === 0 || edges.length === 0 || questions.length === 0) {
    // Level 1: scan all complete JSON arrays in the response
    const allArrays = extractAllJsonArrays(raw);
    const classified = classifyArrays(allArrays);
    if (nodes.length === 0) nodes = classified.nodes as ParsedNode[];
    if (edges.length === 0) edges = classified.edges as ParsedEdge[];
    if (questions.length === 0) questions = classified.questions as ParsedQuestion[];

    // Level 2: repair truncated/incomplete JSON arrays
    if (nodes.length === 0 || edges.length === 0 || questions.length === 0) {
      const repaired = repairTruncatedArray(raw);
      if (repaired) {
        const repClassified = classifyArrays([repaired]);
        if (nodes.length === 0) nodes = repClassified.nodes as ParsedNode[];
        if (edges.length === 0) edges = repClassified.edges as ParsedEdge[];
        if (questions.length === 0) questions = repClassified.questions as ParsedQuestion[];
      }
    }

    // Level 3: try extracting single objects
    if (nodes.length === 0 || edges.length === 0) {
      const obj = extractJsonObject(raw);
      if (obj) {
        if (obj.nodes && Array.isArray(obj.nodes)) nodes = obj.nodes as ParsedNode[];
        if (obj.edges && Array.isArray(obj.edges)) edges = obj.edges as ParsedEdge[];
        if (nodes.length === 0 && (obj.id || obj.label)) nodes = [obj as unknown as ParsedNode];
        if (edges.length === 0 && (obj.source || obj.target)) edges = [obj as unknown as ParsedEdge];
      }
    }
  }

  return { title, description, content, nodes, edges, questions };
}

export namespace AiService {
  export async function getCategoriesInfo() {
    const categories = await prisma.module.groupBy({
      by: ["categoryId"],
      where: { isDraft: false },
      _count: true,
      orderBy: { categoryId: "asc" },
    });

    const catIds = categories.map((c) => c.categoryId).filter(Boolean) as string[];
    const catMap = new Map<string, string>();
    if (catIds.length > 0) {
      const cats = await prisma.category.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true },
      });
      for (const c of cats) catMap.set(c.id, c.name);
    }
    const catName = (id: string | null) => (id && catMap.get(id)) || "uncategorized";

    const titles = await prisma.module.findMany({
      where: { isDraft: false },
      select: { title: true, slug: true, categoryId: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      categories: categories.map((c) => ({ name: catName(c.categoryId), count: c._count })),
      existingTitles: titles.map((t) => ({ title: t.title, slug: t.slug, category: catName(t.categoryId) })),
    };
  }

  export async function autoGenerate(selectedCategory?: string) {
    const info = await getCategoriesInfo();
    const existingTitles = info.existingTitles.map((t) => t.title);

    let categoryName: string;
    if (selectedCategory && info.categories.find((c) => c.name === selectedCategory)) {
      categoryName = selectedCategory;
    } else {
      info.categories.sort((a, b) => a.count - b.count);
      categoryName = info.categories[0]?.name || "mindset";
    }

    const cat = await prisma.category.findUnique({ where: { name: categoryName }, select: { id: true } });
    if (!cat) throw new AppError(`Category "${categoryName}" not found`, 400);

    const prompt = generateModulePrompt(categoryName, existingTitles);

    const raw = await callAI(prompt, 16384);
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
        categoryId: cat.id,
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
        const text = await callAI(generateQuestionsPrompt(content, title), 2048);
        const parsed = extractJson(text);
        return { questions: Array.isArray(parsed) ? parsed : [] };
      }
      case "graph": {
        const text = await callAI(generateGraphPrompt(content, title), 2048);
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
