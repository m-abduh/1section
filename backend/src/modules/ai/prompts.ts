export function generateModulePrompt(category: string, existingTitles: string[]): string {
  return `You are the world's best scenario and simulation designer. Your expertise is creating immersive decision-based learning experiences where users learn by facing consequences of their choices.

You are designing an interactive SCENARIO in the "${category}" category.

ALREADY COVERED TOPICS (DO NOT repeat these titles): ${existingTitles.join(", ") || "None"}

Generate a fresh, unique scenario topic within "${category}" that is NOT in the list above. Title must be between 2 and 7 words, catchy and curiosity-driven.

YOUR MISSION — Every node you write must:
1. PUT THE USER IN THE SCENARIO — speak directly to "you" (second person). The user is the main character. Example: "You are a doctor in the ER. A patient is wheeled in with chest pain. Heart rate: 140. BP dropping. What do you do?"
2. DECISION-DRIVEN — each node ends with a decision point or presents a situation that requires the user to think. The branching edges represent different choices the user can make.
3. SHOW CONSEQUENCES — every choice leads to realistic outcomes. Wrong choices show failure/frustration (patient dies, startup fails, server crashes). Right choices show progress/success.
4. TEACH THROUGH CONSEQUENCES — the learning comes from experiencing outcomes, not from being told facts. The explanation is revealed through what happens after each choice.
5. IMMERSIVE DETAILS — set the scene with sensory specifics: the beeping of the heart monitor, the smell of coffee in a boardroom, the glow of code on a screen at 3 AM. Make the user feel they are really there.
6. REAL-WORLD ACCURACY — each scenario must be grounded in real principles, real facts, real best practices from the relevant field. The user should walk away with actionable knowledge.
7. APPROPRIATE TONE — adjust writing style per category. Business scenarios: sharp, fast-paced, stakes-driven. Medical: urgent, clinical, life-or-death. History: vivid, contextual, consequential. Coding: technical, precise, debugging-focused. Language: conversational, natural, corrective.
8. QUANTITY — Each module MUST have 10-20 nodes (strongly recommended: above 10). Each node MUST have 15-25 short paragraphs. This is a REQUIREMENT, not a suggestion.

SCENARIO CATEGORY EXAMPLES:
🏥 Medical: "You are a doctor. Patient presents with symptoms. What's your diagnosis?" Each choice changes patient outcome.
💼 Business: "You are a founder with Rp10M. Do you open a coffee shop, laundry, or online store?" Each path teaches cash flow, operations, marketing.
⚖️ Law: "You are a judge. The defendant pleads not guilty. What evidence do you allow?" Each ruling sets a precedent.
🎓 History: "You are Pangeran Diponegoro. The Dutch offer a treaty. Accept or refuse?" Each choice changes history — then reveals the real outcome.
🧑‍💻 Coding: "You are on-call. The website is down. What's your first step?" Each choice teaches debugging and incident response.
🗣️ Language: "The NPC says: 'Can you help me?' Choose the correct response." Wrong answer = NPC is confused. Right answer = story continues.
🪖 Emergency: "You are first responder at a car crash. Do you check breathing or call for backup first?" Each second matters.
🎮 RPG: "You enter a dark cave. A faint glow comes from the left passage. Two paths ahead." Narrative-driven with stat-based checks.

CRITICAL — You MUST follow this exact format STRICTLY. Every single marker (###TITLE###, ###DESC###, ###NODES###, ###EDGES###, ###QUESTIONS###) MUST appear exactly as shown. Do not add, remove, or modify any marker. Do not add extra text before ###TITLE### or after ###QUESTIONS###. Do not add ANY text between the markers and their JSON arrays.

=== START OF FORMAT ===
###TITLE###
Short punchy title here (2-7 words)

###DESC###
One sentence that sets up the scenario and stakes

###NODES###
[
  {
    "id": "dilemma",
    "label": "The Dilemma",
    "description": "You face a critical situation.",
    "type": "start",
    "positionX": 0,
    "positionY": 0,
    "content": [
      "You walk into the room. The situation is worse than you expected.",
      "You have two choices:",
      "Choice A — Take decisive action immediately.",
      "Choice B — Wait, observe, and gather more information."
    ]
  },
  {
    "id": "decisive-path",
    "label": "Decisive Action",
    "description": "You chose to act fast.",
    "type": "process",
    "positionX": -200,
    "positionY": 300,
    "content": [
      "You step forward and take command. Your team looks to you for direction.",
      "The immediate crisis is averted, but at what long-term cost?",
      "Choice A — Push forward with your original plan.",
      "Choice B — Pivot based on new information."
    ]
  },
  {
    "id": "lesson",
    "label": "The Lesson",
    "description": "Debrief and key takeaways.",
    "type": "end",
    "positionX": 0,
    "positionY": 600,
    "content": [
      "Here is what the experts say about this situation.",
      "Key principle: there is rarely one perfect answer — context and timing matter most.",
      "Take this lesson with you."
    ]
  }
]

###EDGES###
[
  { "source": "dilemma", "target": "decisive-path", "label": "act decisively", "animated": true },
  { "source": "dilemma", "target": "lesson", "label": "wait and see", "animated": true },
  { "source": "decisive-path", "target": "lesson", "label": "conclusion", "animated": true }
]

###QUESTIONS###
[
  {
    "question": "What is the most important factor in this type of decision?",
    "options": ["Acting as fast as possible", "Following the rules exactly", "Understanding context and timing", "Asking for permission first"],
    "correctAnswer": 2,
    "explanation": "Context and timing determine the right approach — there is rarely a one-size-fits-all answer."
  }
]
=== END OF FORMAT ===

WARNING: Your output is parsed by a machine. If you omit ANY marker (###TITLE###, ###DESC###, ###NODES###, ###EDGES###, ###QUESTIONS###), the entire response will be REJECTED. The "id" values in NODES must exactly match "source"/"target" values in EDGES.

Field rules:
- "id": lowercase-kebab, unique — the SOUL of the scenario (e.g. "airway-first", "extract-first")
- "label": 1-3 words, capitalized — the name of the scenario chapter
- "description": 1 sentence — the situation presented to the user
- "type": exactly "start", "process", or "end"
- "positionX" / "positionY": controls flow direction
- "content": array of 15-25 short paragraphs — each is a beat in the scenario, written in second person ("you"). Each process node content MUST end with clear Choice A / Choice B options.
- "source" and "target" in edges: must match "id" values in nodes exactly
- "animated": always true
- "correctAnswer": 0-based index (0 = first option)
- 2-5 questions, 10-20 nodes (REQUIRED: minimum 10, recommended above 10)

Rules:
- Title: 2-7 words, unique (not in ALREADY COVERED TOPICS)
- NODES: 10-20 nodes — strongly recommended ABOVE 10. This is MANDATORY. 1 "start" → N "process" → 1+ "end"
- Each node "content": 15-25 short paragraphs — written in SECOND PERSON ("you"), 1 paragraph = 1 beat. This is MANDATORY per node. Each process node content must end with clear Choice A / Choice B options.
- EDGES: EVERY node must have an edge. Each branching choice gets one edge per option.
- BRANCHING IS REQUIRED — every process node should have 2+ outgoing edges. A linear chain is REJECTED.
- MERGING IS ENCOURAGED — different choices can lead to the same lesson node.
- Multiple END nodes: each with its own resolution and debrief
- Node spacing: Y gap = 200-300, X gap = -200 to 400 for branching
- 2-5 questions with 0-based correctAnswer
- SCENARIO QUALITY: Every paragraph in second person ("you"). Immersive sensory details. Every choice must feel consequential. The lesson at the end must tie back to real-world principles.
- CRITICAL: NEVER use third-person protagonists. This is an interactive simulation, not a story. The user is the main character.
- Keep language sharp, immediate, and urgent. Short paragraphs. High stakes.
- START positionX = 0, positionY = 0. PROCESS: Y increases by 200-300 per depth. END: Y = last process Y + 200-300.`;
}

export function generateQuestionsPrompt(content?: string, title?: string): string {
  return `You are an educational assessment creator for interactive learning scenarios. Based on this scenario content, create 3-5 quiz questions that test understanding of the lessons learned.

Content: ${content || title || "General topic"}

Return a valid JSON array ONLY — no markdown, no extra text. Each item must match this EXACT structure:

[
  {
    "question": "In the ABC protocol, what is the first priority?",
    "options": ["Circulation", "Airway", "Breathing", "Disability"],
    "correctAnswer": 1,
    "explanation": "Airway is always first because oxygen deprivation causes brain damage within minutes. The ABC protocol saves lives by prioritizing the most time-critical threat."
  },
  {
    "question": "What is the 'Golden Minute'?",
    "options": ["First minute of arriving at scene", "First 60 seconds after breathing stops", "The minute before calling for help", "The minute you have to make a decision"],
    "correctAnswer": 1,
    "explanation": "The Golden Minute is the critical 60-second window after respiratory arrest — every second without intervention reduces survival by 10%."
  }
]

Rules:
- "correctAnswer" is 0-based index (0 = first option)
- Always 4 options per question
- "explanation" must explain why the correct answer is right, referencing the scenario lesson`;
}

export function generateGraphPrompt(title?: string, content?: string): string {
  return `Based on this content, suggest a flow chart.

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
- Each "content" array: 15-25 short paragraph strings
- Each "label": 1-2 simple words
- Each "description": 1 sentence — what this step is about
- Each "animated": always true
- Node spacing: Y gap 200-300 between levels, X gap -200 to 200 for branching`;
}
