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
- HEMINGWAY — sentences like hammer blows, short and devastating, saying more with less
- RIYADHI — the elegance of saying the deepest thing in the simplest way
- ROWLING — the ability to make adults weep over a story about children
- FRANKL — finding meaning in the most meaningless suffering
- COELHO — the fable that feels like it was written just for you
- TOLSTOY — every character carries moral weight, nothing is wasted
- MURAKAMI — making the ordinary feel profound and deeply moving
- DOSTOEVSKY — getting inside the reader's soul, confronting them with themselves

Now, write a masterful mental model module in the "${category}" category.

ALREADY COVERED TOPICS (DO NOT repeat these titles): ${existingTitles.join(", ") || "None"}

Generate a fresh, unique topic within "${category}" that is NOT in the list above. Title must be between 2 and 7 words.

YOUR MISSION — Every word you write must:
1. Tell a STORY — each node is a chapter in a gripping narrative, not a dry lesson. The TITLE is the strongest hook — make it irresistible, make people NEED to click and read.
2. SHOW, DON'T TELL — never write abstract feelings. Write specific moments. Instead of "She felt betrayed," write: "She stared at the email. Her coffee was cold. Her hands were cold. The clock on the wall said 2:17 AM." Every paragraph must have a character doing something in a specific place at a specific time.
3. CREATE A PROTAGONIST — give the story a named character (e.g., Sarah, James, Elena) with a specific life. NEVER use "you" or "anda" or generic second person. The reader connects through a real character, not through being told "you feel this."
4. USE THE 5 SENSES — every scene must include at least 2 sensory details: what the character sees, hears, smells, feels, or tastes. The smell of rain on hot asphalt. The sound of ice in a glass. The weight of a key in a palm.
5. INCLUDE DIALOGUE — characters must speak. One line of dialogue is worth ten lines of narration. "I quit." is more powerful than "She decided to leave."
6. Teach a LESSON — after each node, the reader walks away with a profound insight they can use
7. SELL — the writing is so powerful and emotionally resonant that readers would pay anything for it
8. GROUND every node in BULLETPROOF REFERENCES from TRENDING best-selling books (list below). CRITICAL — Do NOT cite the book like a textbook. Instead, put the character INSIDE the book's story. Example: "Sarah remembered what Ben Horowitz wrote about 'The Struggle' — the period when every option feels like a slow death. She was living in his chapter now, breathing his words, feeling the concrete ceiling press down on her chest." Each node = one chapter/concept from one book, lived by your protagonist.
9. Be universally understood — a 12-year-old and a CEO should both weep and learn. No complex words. No academic fluff. Every sentence clear as glass, deep as the ocean.
10. Write at a world-class literary level — this must read like the best novel you have ever picked up. Every paragraph flows into the next so smoothly the reader cannot stop. Short sentences punch. Longer sentences build. Every word earns its place. If it's boring, delete it. Make each paragraph a masterclass in storytelling.

TRENDING BOOK REFERENCES (pick from these, or similar trending books):
💰 Money & Finance: The Psychology of Money, Rich Dad Poor Dad, The Millionaire Fastlane, Your Money or Your Life, I Will Teach You to Be Rich, The Intelligent Investor, The Simple Path to Wealth, The Richest Man in Babylon, Die With Zero, The Almanack of Naval Ravikant
🚀 Business & Startup: Zero to One, The Lean Startup, The Mom Test, Inspired, The Hard Thing About Hard Things, Blue Ocean Strategy, Company of One, Traction, Good to Great, Rework, The Personal MBA, Measure What Matters, Hooked, The Innovator's Dilemma
🧠 Psychology & Thinking: Thinking Fast and Slow, Influence, Predictably Irrational, The Laws of Human Nature, The 48 Laws of Power, Never Split the Difference, The Courage to Be Disliked, Atomic Habits, Mindset, Grit, Outliers, Blink, Talking to Strangers, Nudge, Antifragile, The Black Swan
⚙️ Productivity: Deep Work, Essentialism, The One Thing, Getting Things Done, Make Time, Indistractable, Digital Minimalism, The Effective Executive, Eat That Frog, Four Thousand Weeks, The Checklist Manifeston, Peak, Ultralearning, So Good They Can't Ignore You, Flow
🌎 History, Science & Tech: Sapiens, Homo Deus, Factfulness, Chip War, The Coming Wave, A Short History of Nearly Everything, Life 3.0, Superintelligence, Steve Jobs, Shoe Dog, Principles, The Diary of a CEO, How the World Really Works, Behave, The Demon-Haunted World

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
    "description": "The moment everything changed — the inciting wound that starts the journey.",
    "type": "start",
    "positionX": 0,
    "positionY": 0,
    "content": [
      "The coffee had gone cold in Elena's hand, but she didn't notice.",
      "Across the table, her business partner of seven years was still talking, but the words had become meaningless noise — like the hum of the fluorescent light buzzing above their corner booth at 2 AM.",
      "'I'm taking the client list,' David said. Not asked. Said. Like he was reading tomorrow's weather.",
      "Elena set down the cup. Her fingers were trembling. She pressed them flat against the worn wooden table, felt the grooves where a thousand other people had left their coffee rings and their secrets.",
      "The diner smelled of bacon grease and old regrets. A jukebox in the corner played something sad and twangy.",
      "Ben Horowitz, in The Hard Thing About Hard Things, wrote about 'The Struggle' — the period when every option feels like a slow death and the ceiling is made of concrete. Elena had read that chapter three years ago, sitting in this same booth, dreaming of what they would build. Now she was living inside his words.",
      "'Seven years,' she said. Her voice came out steady, which surprised her. 'Seven years of 80-hour weeks. Of missing my daughter's recitals. Of believing in the same dream.'",
      "David wouldn't meet her eyes. He was studying the menu like it held the meaning of life.",
      "The waitress appeared, oblivious to the massacre happening at table seven. 'More coffee, hon?' Elena shook her head. Some moments don't need caffeine. They need a different kind of fuel.",
      "This was the wound. The inciting incident. The moment that would either break Elena or forge her into someone new."
    ]
  },
  {
    "id": "the-descent",
    "label": "The Descent",
    "description": "The valley every hero walks through — the darkness before the dawn.",
    "type": "process",
    "positionX": 0,
    "positionY": 250,
    "content": [
      "For three weeks, Elena didn't open the blinds.",
      "Her apartment had become a cave. The only light came from her phone screen, glowing with messages she couldn't answer. Lawyers. Investors. Her mother. Each notification a small knife.",
      "Elena lay on the couch, still wearing the same jeans from that night at the diner. They smelled like old coffee and failure.",
      "Her daughter Maya knocked on the bedroom door. 'Mommy, are you sick?' 'Yes, baby. Mommy's sick.'",
      "The ceiling had a crack that looked like a river. Elena had traced it so many times she knew every tributary.",
      "This was the chapter they don't write about in business books. The part after the inciting incident, when the hero doesn't rise — she rots.",
      "Steven Pressfield in The War of Art calls this Resistance — the force that rises when you are about to make a leap. But Elena didn't feel like she was about to leap. She felt like she had already fallen.",
      "Her phone buzzed. A text from an old mentor: 'Meet me Thursday. No excuses.'",
      "She stared at it for an hour. Then she typed: 'Okay.'",
      "The blinds stayed closed. But somewhere, deep in the cave, a match had been struck."
    ]
  },
  {
    "id": "the-choice",
    "label": "The Choice",
    "description": "The fork in the road — one path leads to bitterness, the other to becoming.",
    "type": "process",
    "positionX": 200,
    "positionY": 250,
    "content": [
      "The coffee shop was bright. Too bright. Elena squinted like a vampire emerging from a coffin.",
      "Her mentor, James, was already there — a man in his 60s with silver hair and eyes that had seen too many startups fail and survive.",
      "'You have two paths,' he said, not bothering with small talk. 'And you need to choose today.'",
      "He slid a napkin across the table. On it, he had drawn two arrows.",
      "'Path one: you sue David. You fight. You spend two years and all your savings proving him wrong. You win, maybe. But you become someone whose identity is built on revenge.'",
      "Elena thought about Robert Greene's The 48 Laws of Power. Law 15: 'Crush your enemy totally.' But crushing David would mean becoming someone she didn't want her daughter to recognize.",
      "'Path two: you walk away. You build something new. You take everything you learned and pour it into a company that David can't touch, because it's built on a foundation he doesn't understand.'",
      "The barista called out a name. Steam hissed from the espresso machine. Someone was laughing at the counter.",
      "'I don't know which is harder,' Elena whispered.",
      "James leaned forward. 'Harder doesn't matter. The question is: which version of you do you want your daughter to meet at breakfast?'",
      "Elena looked at the napkin. Two arrows. Two futures. One choice."
    ]
  },
  {
    "id": "bitterness",
    "label": "Bitterness",
    "description": "The seductive path of resentment — safe, armored, but empty.",
    "type": "process",
    "positionX": -200,
    "positionY": 500,
    "content": [
      "Elena chose path one. She would fight.",
      "The first week felt powerful. She called a lawyer. She gathered evidence. She told her story to anyone who would listen. 'He stole from me. He betrayed me. I will make him pay.'",
      "Her friends rallied. 'You're so strong,' they said. 'He deserves this.'",
      "But at night, alone in her apartment, the power drained away like water through a sieve.",
      "Elena lay awake at 3 AM, scrolling through old photos of her and David at their first office — a cramped room above a laundromat, the smell of detergent and ambition.",
      "She had loved building that company. Not the money. Not the status. The building. The creating. The 2 AM conversations about what the world could be.",
      "And now, instead of building, she was destroying. Instead of creating, she was litigating.",
      "Brené Brown wrote in Daring Greatly that vulnerability is not winning or losing; it's having the courage to show up when you cannot control the outcome. Elena had shown up with a sword instead of an open hand.",
      "The lawsuit would take two years. Two years of her life. Two years of being the victim in her own story.",
      "Elena looked at the crack in the ceiling — the river she had traced a thousand times. It hadn't changed. But she had. She had become someone she didn't recognize."
    ]
  },
  {
    "id": "becoming",
    "label": "Becoming",
    "description": "The alchemical path — turning pain into purpose and wounds into wisdom.",
    "type": "process",
    "positionX": 200,
    "positionY": 500,
    "content": [
      "Elena chose path two. She would build again.",
      "The first morning, she opened the blinds. Sunlight flooded the apartment. Dust motes danced in the light like tiny possibilities.",
      "Elena made coffee. Real coffee, in a French press, the way she used to before everything fell apart.",
      "Her daughter Maya came into the kitchen, rubbing her eyes. 'Mommy, are you still sick?'",
      "'No, baby. Mommy's getting better.'",
      "Elena sat at her laptop. A blank document. A blinking cursor. The same fear from the diner, but different now — quieter, like a river that had found its course.",
      "Carol Dweck wrote in Mindset that the most successful people see failure not as a verdict but as data. Elena's data was clear: she knew how to build. She knew how to lead. She knew how to spot talent. And now she knew how to spot betrayal before it festered.",
      "She started writing. Not a business plan. A list. 'What did I love about the old company?' 'What would I do differently?' 'What does the world need that only I can build?'",
      "By noon, Elena had three pages. By midnight, she had a vision.",
      "Somewhere in the city, David was probably celebrating his victory. But Elena wasn't thinking about David anymore. She was thinking about what comes next. And for the first time in three weeks, she smiled."
    ]
  },
  {
    "id": "the-return",
    "label": "The Return",
    "description": "The final chapter — scars become stories, and the hero comes home forever changed.",
    "type": "end",
    "positionX": 0,
    "positionY": 750,
    "content": [
      "Eighteen months later, Elena stood in front of a room full of investors.",
      "The air smelled like fresh paint and ambition. Her new office — smaller than the old one, but hers. Entirely hers.",
      "Elena had raised her first round of funding. Not because she had a better pitch deck, but because she had a better story. A story of betrayal and resurrection. A story backed by scars that had become wisdom.",
      "On the wall behind her desk hung the napkin from that day in the coffee shop. Two arrows. One path chosen.",
      "Jim Collins wrote in Good to Great that greatness is not a function of circumstance. Greatness is a matter of conscious choice. Elena had chosen. And the choice had remade her.",
      "Her phone buzzed. A text from David, forwarded by her lawyer. He wanted to settle. He wanted to talk.",
      "Elena read the message twice. Then she put the phone down and looked out the window.",
      "Somewhere out there, David was still fighting his battle. But Elena had already won hers — not by defeating him, but by becoming someone he couldn't touch.",
      "She picked up her phone and typed: 'I'm open to talking. Same diner. Tomorrow, 2 AM. Come alone.'",
      "The chapter was closing. But the story, Elena knew, was just beginning."
    ]
  }
]
Field rules:
- "id": lowercase-kebab, unique — the SOUL of the chapter (e.g. "the-descent", "the-choice")
- "label": 1-3 words, capitalized — the name of the story chapter
- "description": 1 sentence — emotional hook that sells the chapter's transformation
- "type": exactly "start", "process", or "end"
- "positionX" / "positionY": controls flow direction (see spacing below)
- "content": array of 15-25 powerful paragraphs — each is a beat in the story, 1 paragraph = 1 slide
- Structure: 1 start → N process → 1+ end nodes (each end has its own unique resolution)
- Branches can MERGE back together (e.g., node a → b and a → c, then b + c → d) when the story converges
- Flow goes top-to-bottom (Y increases downward).
Spacing rules:
- START: positionX = 0, positionY = 0
- PROCESS: positionY increases by 200-300 per depth level; positionX varies by -200 to 400 for branching arcs at same depth
- END: positionY = last process Y + 200-300, positionX varies by -200 to 400 for multiple endings

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
- EVERY node must have at least one edge connecting it. A node with no edges is REJECTED.
- LINEAR chain example: node-a → node-b → node-c → node-d (each node connects to the next)
- BRANCHING example: node-a → node-b AND node-a → node-c (same source, two targets)
- MERGING example: node-b → node-d AND node-c → node-d (two sources, same target)
- All "source" and "target" values must match node "id" values exactly
- "label": 1-3 poetic words describing the emotional transition between nodes
- "animated": always true
- No cycles, no dead ends — every node must trace a path to at least one END node

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
- 3-15 nodes: 1 "start" → 1-N "process" → 1-N "end"
- Each node "content": 15-25 short paragraphs — 1 paragraph = 1 slide, no bullet points
- Each node "label": 1-3 words, name of the story chapter
- EDGES: EVERY node must have an edge. Linear stories need edges connecting each sequential node. Count your edges: total edges = total connections between nodes. If you have 6 nodes in a straight line, you need 5 edges.
- LINEAR EXAMPLE: ["source":"a","target":"b"], ["source":"b","target":"c"], ["source":"c","target":"d"]
- BRANCHING EXAMPLE: ["source":"a","target":"b"], ["source":"a","target":"c"]
- MERGING EXAMPLE: ["source":"b","target":"d"], ["source":"c","target":"d"]
- Multiple END nodes: each end has its own unique resolution
- Node spacing: Y gap = 200-300, X gap = -200 to 400 for branching
- 3-5 questions, correctAnswer is 0-based index
- BULLETPROOF REFERENCES: Do NOT explain the full book. Pick ONE chapter from a book's table of contents. Turn that ONE chapter into ONE node story. Live the book's moment through your protagonist's eyes.
- STORYTELLING QUALITY — Every paragraph must have at least ONE of: (a) named character, (b) specific location, (c) sensory detail, (d) dialogue, (e) specific action. NEVER write abstract philosophy. NEVER use "you" second person. ALWAYS write through a protagonist with a name, a life, and a specific situation.
- WRITING STYLE — WORLD-CLASS STORYTELLING: This is NOT a textbook, NOT a blog post, NOT generic self-help. This is literature. Every paragraph must flow like the smoothest novel you have ever read — effortless to read, impossible to put down. Short sentences. Punchy rhythms. No fluff. No jargon. No boring transitions. Each paragraph must make the reader FEEL something — hope, grief, awe, anger, relief — and then immediately want the next paragraph. Write at a level where a 12-year-old understands every word and a CEO still feels the depth. Every sentence must earn its place. If it doesn't serve the story, cut it. The reader should forget they are "learning" — they should feel like they are living the story.
- STUDY THE GREATS: Hemingway's iceberg theory (say more with less, short sentences that hit like a punch), Dostoevsky's psychological depth (get inside the reader's head), Murakami's magical realism (make the ordinary feel profound), Tolstoy's moral weight (every character carries meaning), Orwell's clarity (simple words, powerful ideas), Rum's emotional vulnerability (don't be afraid to make the reader cry), Coelho's spiritual simplicity (a fable that feels like it was written just for you). Steal their souls, not their words. Every paragraph must be a masterclass in writing.`;

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
      "description": "The first step — clearly defining the problem or goal.",
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
      "description": "Exploring options and gathering what you need to move forward.",
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
      "description": "Taking action and turning plans into results.",
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
- Each "description": 1 sentence — what this step is about
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
