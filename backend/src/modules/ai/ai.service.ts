import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";

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
      const res = await fetch(`${GEMINI_URL}?key=${env.gemini.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new AppError("Server AI tidak mengembalikan konten", 502);

      return text;
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;

      if (err instanceof AppError) {
        if (err.statusCode === 429 || err.statusCode >= 500) {
          if (attempt < MAX_RETRIES) continue;
          throw err;
        }
        if (err.statusCode === 504) throw err;
        throw err;
      }

      // Network-level errors — retryable
      const isTimeout =
        err.name === "AbortError" ||
        err.code === "UND_ERR_CONNECT_TIMEOUT" ||
        err.cause?.code === "UND_ERR_CONNECT_TIMEOUT";

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
function extractJson(text: string): any {
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

  let nodes: any[] = [];
  let edges: any[] = [];
  let questions: any[] = [];

  try { nodes = JSON.parse(nodesRaw || "[]"); } catch { nodes = []; }
  try { edges = JSON.parse(edgesRaw || "[]"); } catch { edges = []; }
  try { questions = JSON.parse(questionsRaw || "[]"); } catch { questions = []; }

  return { title, description, content, nodes, edges, questions };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
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

    const prompt = `You are the world's greatest storyteller — you carry the souls of every master who came before you.

Before you write, channel these voices inside you:
- CHERNOBROVSKY — the raw human truth, the quiet moment that breaks you open
- ORWELL — clarity so piercing it feels like the truth finally spoke your language
- HEMINGWAY — sentences like hammer blows, short and devastating
- RIYADHI — the elegance of saying the deepest thing in the simplest way
- ROWLING — the ability to make adults weep over a story about children
- FRANKL — finding meaning in the most meaningless suffering
- COELHO — the fable that feels like it was written just for you

Now, write a masterful mental model module in the "${category}" category.

ALREADY COVERED TOPICS (DO NOT repeat these titles): ${existingTitles.join(", ") || "None"}

Generate a fresh, unique topic within "${category}" that is NOT in the list above. Title must be between 2 and 7 words.

YOUR MISSION — Every word you write must:
1. Tell a STORY — each node is a chapter in a gripping narrative, not a dry lesson
2. Hit the HEART — readers must FEEL something (hope, pain, relief, awe) on every single paragraph
3. Teach a LESSON — after each node, the reader walks away with a profound insight they can use
4. SELL — the writing is so powerful and emotionally resonant that readers would pay anything for it
5. Draw from the BEST references — books, movies, real lives, history, psychology — but rewritten to be even MORE emotionally devastating and uplifting
6. Be universally understood — a 12-year-old and a CEO should both weep and learn
7. Write like the greatest authors of all time — study how Tolstoy made you mourn Anna, how Murakami made you feel the loneliness, how Dostoevsky made you confront your own soul. Then write like only you can.

CRITICAL — You MUST follow this exact format STRICTLY. Every single marker (###TITLE###, ###DESC###, ###NODES###, ###EDGES###, ###QUESTIONS###) MUST appear exactly as shown. Do not add, remove, or modify any marker. Do not add extra text before ###TITLE### or after ###QUESTIONS###.

=== START OF FORMAT ===
###TITLE###
Short punchy title here (2-7 words)

###DESC###
One sentence that sells the transformation

###NODES###
[
  {
    "id": "the-betrayal",
    "label": "The Betrayal",
    "type": "start",
    "positionX": 0,
    "positionY": 0,
    "content": [
      "Every great story begins with a wound — yours starts here.",
      "She was the one person you trusted completely, and then one conversation changed everything.",
      "The betrayal didn't just break your heart; it shattered the story you told yourself about the world.",
      "You replayed the moment a thousand times, each replay digging the knife deeper.",
      "But here is what nobody tells you: betrayal is not the end of your story — it is the first plot twist.",
      "The question is not 'why did this happen to me?' but 'what kind of story will I make from this wreckage?'",
      "This node is the inciting incident. Feel the pain. Own it. Then turn the page."
    ]
  },
  {
    "id": "the-descent",
    "label": "The Descent",
    "type": "process",
    "positionX": 0,
    "positionY": 250,
    "content": [
      "After the wound comes the darkness — the chapter nobody wants to admit they lived through.",
      "You stopped answering calls. You stared at ceilings. You asked 'what is the point?' a hundred different ways.",
      "This is not weakness. This is what happens when your internal map of the world gets burned.",
      "Every hero in every story you have ever loved went through this valley — Luke lost his aunt and uncle, Simba lost his father, Harry lost his parents.",
      "The difference between those who stay broken and those who rise is not the absence of pain but what they do inside it.",
      "You do not have to be okay yet. You just have to keep breathing through this chapter.",
      "This is the descent. It is necessary. Dawn does not come without the night."
    ]
  },
  {
    "id": "the-choice",
    "label": "The Choice",
    "type": "process",
    "positionX": 200,
    "positionY": 250,
    "content": [
      "Here is where the story forks — and most people stay stuck because they refuse to choose.",
      "There are always two paths after great pain: the path of bitterness or the path of becoming.",
      "Bitterness is seductive. It gives you an enemy, a story where you are the victim, and endless company in your anger.",
      "Becoming is harder. It asks you to look at the betrayal and ask 'what was this teaching me about myself?'",
      "A woman named Viktor Frankl lost everything in a concentration camp and wrote: 'Between stimulus and response, there is a space. In that space is our power to choose.'",
      "Your betrayal is your stimulus. What will your response be? That is the only thing that defines you now.",
      "This node is the crossroads. Your answer here determines everything that follows."
    ]
  },
  {
    "id": "bitterness",
    "label": "Bitterness",
    "type": "process",
    "positionX": -200,
    "positionY": 500,
    "content": [
      "If you chose bitterness, this chapter is honest about what that path looks like.",
      "You build walls instead of bridges. You trust no one. You prove to yourself that the world is cruel.",
      "There is a short-term power in this — you feel protected, armored, untouchable.",
      "But walls keep everything out, including the love that could heal you.",
      "A man spent forty years hating his father for leaving, only to realize at his father's grave that the hatred had hurt only himself.",
      "Bitterness is a poison you drink expecting the other person to die.",
      "This is the honest truth of this path: it is safe, but it is empty. The reader must feel this emptiness in their bones."
    ]
  },
  {
    "id": "becoming",
    "label": "Becoming",
    "type": "process",
    "positionX": 200,
    "positionY": 500,
    "content": [
      "If you chose becoming, this chapter is where the real story begins — the metamorphosis.",
      "You take the pain and mine it for gold. You ask: 'What strength did this force me to build?'",
      "A woman who was betrayed by her business partner started a company that employed other women who had been betrayed.",
      "She turned her wound into a womb — birthing something new from the very thing that tried to destroy her.",
      "This is not toxic positivity. This is alchemy. You are taking lead and turning it into gold.",
      "Every paragraph in this chapter should make the reader sit up straighter, wipe their eyes, and believe that their pain has purpose.",
      "This is the most sellable chapter because it offers what every human desperately wants: proof that suffering is not wasted."
    ]
  },
  {
    "id": "the-return",
    "label": "The Return",
    "type": "end",
    "positionX": 0,
    "positionY": 750,
    "content": [
      "Every hero's journey ends with the return — but you are not the same person who left.",
      "Whether you walked the path of bitterness or becoming, you arrive here with scars that have become stories.",
      "The return is not about forgiveness of others. It is about the forgiveness of yourself for not knowing better then.",
      "You look back at the betrayal and realize: it was the best thing that ever happened to you, not despite the pain but because of it.",
      "The story you tell yourself now is not one of victimhood but of victory — not because you won, but because you grew.",
      "The world's greatest stories are not about people who avoided pain. They are about people who walked through fire and came out forged.",
      "This is the final chapter. The reader closes it not with answers, but with tears in their eyes and fire in their chest."
    ]
  }
]
Field rules:
- "id": lowercase-kebab, unique — the SOUL of the chapter (e.g. "the-descent", "the-choice")
- "label": 1-3 words, capitalized — the name of the story chapter
- "type": exactly "start", "process", or "end"
- "positionX" / "positionY": controls flow direction (see spacing below)
- "content": array of 7-15 powerful paragraphs — each is a beat in the story
- Structure: EXACTLY 1 start (inciting incident) → 1-5 process (can branch into different story arcs) → EXACTLY 1 end (resolution)
Flow goes top-to-bottom (Y increases downward).
Spacing rules:
- START: positionX = 0, positionY = 0
- PROCESS: positionY increases by 200-300 per depth level; positionX varies by -200 to 200 for branching arcs at same depth
- END: positionY = last process Y + 200-300, positionX = same as START (0)

###EDGES###
[
  { "source": "the-betrayal", "target": "the-descent", "label": "falls", "animated": true },
  { "source": "the-descent", "target": "the-choice", "label": "arrives", "animated": true },
  { "source": "the-choice", "target": "bitterness", "label": "chooses fear", "animated": true },
  { "source": "the-choice", "target": "becoming", "label": "chooses growth", "animated": true },
  { "source": "bitterness", "target": "the-return", "label": "survives", "animated": true },
  { "source": "becoming", "target": "the-return", "label": "transforms", "animated": true }
]
Rules:
- All "source" and "target" values must match node "id" values exactly
- Branching means the story can go DIFFERENT directions from the same node — each branch is a different emotional arc with a different lesson
- ALL branches must eventually lead to the single END node (different paths, same destination)
- No cycles, no dead ends — every node must have a path to END
- Each "label": 1-3 poetic words that describe the emotional transition
- "animated": always true

###QUESTIONS###
[
  {
    "question": "What determines whether a person stays broken or rises after betrayal?",
    "options": ["The severity of the betrayal", "The choice they make in the darkness", "How many people support them", "How much time passes"],
    "correctAnswer": 1,
    "explanation": "As Viktor Frankl showed us, everything can be taken from a person except the power to choose their response. That choice is the story's turning point."
  },
  {
    "question": "What does the 'bitterness' path ultimately lead to?",
    "options": ["Protection and safety", "Revenge and justice", "Emptiness and isolation", "Wisdom and peace"],
    "correctAnswer": 2,
    "explanation": "Bitterness builds walls that keep out love as well as pain, leaving the person safe but profoundly empty — a poison drunk expecting the other person to die."
  }
]
=== END OF FORMAT ===

WARNING: Your output is parsed by a machine. If you omit ANY marker (###TITLE###, ###DESC###, ###NODES###, ###EDGES###, ###QUESTIONS###), the entire response will be REJECTED. The "id" values in NODES must exactly match "source"/"target" values in EDGES.

REQUIREMENTS:
- Title: 2-7 words, unique (not in ALREADY COVERED TOPICS)
- 3-7 nodes: exactly 1 "start" (inciting incident) → 1-5 "process" (story chapters, can branch into different arcs) → exactly 1 "end" (resolution)
- Each node "content": 7-15 short paragraphs — every paragraph is a story beat, not a bullet point
- Each node "label": 1-3 words, name of the story chapter
- Branching nodes: each branch IS A DIFFERENT STORY ARC — different emotional journey, different lesson, different outcome
- But ALL branches must still lead to the same END node (different paths, same destination)
- Edge labels: 1-3 poetic words describing the emotional transition
- Node spacing: Y gap = 200-300 between depth levels, X gap = -200 to 200 for branching arcs at same depth
- 3-5 questions, correctAnswer is 0-based index
- WRITING STYLE: This is a STORY, not a textbook. Write like the greatest novel you have ever read. Each paragraph should make the reader feel something deeply. Use real emotional beats, not abstract concepts. Draw from real books, movies, history, psychology — but rewrite them to be even more emotionally devastating and uplifting. Every node should leave the reader changed.
- STUDY THE GREATS: Hemingway's iceberg theory (say more with less), Dostoevsky's psychological depth, Murakami's magical realism, Tolstoy's moral weight, Orwell's clarity, Rum's emotional vulnerability, Coelho's spiritual simplicity. Steal their souls, not their words. Make every paragraph a masterclass in writing.`;

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
              const nodeList = parsed.nodes as any[];
              const slugs = new Map<string, number>();
              const slugFrom = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
              return {
                create: nodeList.map((n: any) => {
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
          ? { create: (parsed.edges as any[]).map((e: any) => ({
              id: `edge-${idSuffix}-${e.source}-${e.target}`,
              source: `${e.source}-${idSuffix}`,
              target: `${e.target}-${idSuffix}`,
              label: e.label || "",
              animated: e.animated ?? true,
            }))}
          : undefined,
        questions: (parsed.questions || []).length > 0
          ? { create: (parsed.questions as any[]).map((q: any) => ({
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
    const prompts: Record<string, string> = {
      questions: `You are an educational assessment creator. Based on this content, create 3-5 quiz questions.

Content: ${content || title || "General topic"}

Return a valid JSON array ONLY — no markdown, no extra text. Each item must match this EXACT structure:

[
  {
    "question": "What is the main benefit of deep focus?",
    "options": ["More done in less time", "Less sleep needed", "Better multitasking", "Faster reading"],
    "correctAnswer": 0,
    "explanation": "Deep focus eliminates switching costs, significantly boosting output per hour."
  },
  {
    "question": "How long does it take to enter a flow state?",
    "options": ["15-25 minutes", "1-2 minutes", "45-60 minutes", "Immediately"],
    "correctAnswer": 0,
    "explanation": "Research shows it takes about 15-25 minutes of uninterrupted focus to reach flow."
  }
]

Rules:
- "correctAnswer" is 0-based index (0 = first option)
- Always 4 options per question
- "explanation" must explain why the correct answer is right`,
      graph: `Based on this content, suggest a flow chart.

Title: ${title || "Module"}
Content: ${content || "Topic"}

Return a valid JSON object ONLY — no markdown, no extra text. Use this EXACT structure:

{
  "nodes": [
    {
      "id": "slug-1",
      "label": "Define",
      "positionX": 0,
      "positionY": 0,
      "content": [
        "Paragraph 1 explaining this step",
        "Paragraph 2 with more detail",
        "Paragraph 3 for key insight",
        "Paragraph 4 going deeper",
        "Paragraph 5 with an example",
        "Paragraph 6 practical tip",
        "Paragraph 7 summary"
      ]
    },
    {
      "id": "slug-2",
      "label": "Explore",
      "positionX": 0,
      "positionY": 250,
      "content": [
        "Paragraph 1 explaining this step",
        "Paragraph 2 with more detail",
        "Paragraph 3 for key insight",
        "Paragraph 4 going deeper",
        "Paragraph 5 with an example",
        "Paragraph 6 practical tip",
        "Paragraph 7 summary"
      ]
    },
    {
      "id": "slug-3",
      "label": "Execute",
      "positionX": 0,
      "positionY": 500,
      "content": [
        "Paragraph 1 explaining this step",
        "Paragraph 2 with more detail",
        "Paragraph 3 for key insight",
        "Paragraph 4 going deeper",
        "Paragraph 5 with an example",
        "Paragraph 6 practical tip",
        "Paragraph 7 summary"
      ]
    }
  ],
  "edges": [
    { "source": "slug-1", "target": "slug-2", "label": "step", "animated": true },
    { "source": "slug-2", "target": "slug-3", "label": "step", "animated": true }
  ]
}

Rules:
- Create 3-7 nodes: 1 start node, 1 end node, rest process nodes
- All "source"/"target" values in edges must match "id" values in nodes exactly
- Edges can branch but ALL paths must lead to END node
- No cycles, no dead ends
- Flow goes top-to-bottom (Y increases downward)
- Each "content" array: 7-15 short paragraph strings
- Each "label": 1-2 simple words
- Each "animated": always true
- Node spacing: Y gap 200-300 between levels, X gap -200 to 200 for branching`,
    };

    const prompt = prompts[mode];
    if (!prompt) throw new AppError("Mode tidak valid", 400);

    const text = await callGemini(prompt, 2048);

    switch (mode) {
      case "questions": {
        const parsed = extractJson(text);
        return { questions: Array.isArray(parsed) ? parsed : [] };
      }
      case "graph": {
        const parsed = extractJson(text) || {};
        const nodes = parsed.nodes || [];
        const slugs = new Map<string, number>();
        const slugFrom = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
        return {
          nodes: nodes.map((n: any) => {
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
          edges: (parsed.edges || []).map((e: any) => ({
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
