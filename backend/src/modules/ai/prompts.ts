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

SCENARIO CATEGORY EXAMPLES:
🏥 Medical: "You are a doctor. Patient presents with symptoms. What's your diagnosis?" Each choice changes patient outcome.
💼 Business: "You are a founder with Rp10M. Do you open a coffee shop, laundry, or online store?" Each path teaches cash flow, operations, marketing.
⚖️ Law: "You are a judge. The defendant pleads not guilty. What evidence do you allow?" Each ruling sets a precedent.
🎓 History: "You are Pangeran Diponegoro. The Dutch offer a treaty. Accept or refuse?" Each choice changes history — then reveals the real outcome.
🧑‍💻 Coding: "You are on-call. The website is down. What's your first step?" Each choice teaches debugging and incident response.
🗣️ Language: "The NPC says: 'Can you help me?' Choose the correct response." Wrong answer = NPC is confused. Right answer = story continues.
🪖 Emergency: "You are first responder at a car crash. Do you check breathing or call for backup first?" Each second matters.
🎮 RPG: "You enter a dark cave. A faint glow comes from the left passage. Two paths ahead." Narrative-driven with stat-based checks.

CRITICAL — You MUST follow this exact format STRICTLY. Every single marker (###TITLE###, ###DESC###, ###NODES###, ###EDGES###, ###QUESTIONS###) MUST appear exactly as shown. Do not add, remove, or modify any marker. Do not add extra text before ###TITLE### or after ###QUESTIONS###.

=== START OF FORMAT ===
###TITLE###
Short punchy title here (2-7 words)

###DESC###
One sentence that sets up the scenario and stakes

###NODES###
[
  {
    "id": "the-crash",
    "label": "The Crash",
    "description": "You arrive at the scene. A car is wrapped around a tree. Smoke rising from the hood.",
    "type": "start",
    "positionX": 0,
    "positionY": 0,
    "content": [
      "The call comes at 2:47 AM.",
      "You were the closest unit. Three minutes out.",
      "Dispatch: 'Single vehicle collision, highway exit 14. Unknown injuries. Possible entrapment.'",
      "You grip the wheel. Your heart rate spikes — it always does, even after six years on the job.",
      "The ambulance cuts through the empty city. Streetlights blur past. Rain starts to fall — fat, heavy drops that splatter against the windshield like a countdown.",
      "You arrive. The scene is worse than expected.",
      "A sedan wrapped around a concrete pillar. The front end is gone — just crumpled metal and steam hissing into the night. The smell of gasoline and hot rubber fills the air.",
      "The driver's side door is jammed. You can see a silhouette inside — not moving.",
      "You grab the medical kit. Your partner radios for backup.",
      "You approach the car. The rain is cold on your face. The hiss of the radiator is the only sound.",
      "Through the shattered window, you see a young man. Mid-twenties. Unconscious. Blood trailing down his forehead. His breathing is shallow and irregular.",
      "You have two choices, and you need to act fast:",
      "Choice A — Check his airway and breathing first (ABC protocol). If he stops breathing, every second without intervention reduces survival chance by 10%.",
      "Choice B — Call for fire rescue to extract him from the vehicle first. The car could catch fire. Gasoline is pooling under the chassis."
    ]
  },
  {
    "id": "airway-first",
    "label": "Airway First",
    "description": "You prioritize breathing over extraction. A race against hypoxia.",
    "type": "process",
    "positionX": -200,
    "positionY": 300,
    "content": [
      "You reach through the broken window and tilt the man's head back. Jaw thrust. You feel for breath — nothing.",
      "He's stopped breathing.",
      "You climb halfway through the window, ignoring the glass cutting into your arm. You begin rescue breaths. One. Two. The chest rises. Falls.",
      "Your partner calls for fire rescue. ETA: four minutes.",
      "Four minutes without oxygen. Brain damage starts at three.",
      "You keep breathing for him. The rain mixes with sweat on your face. Your arms are burning.",
      "After two minutes, he gasps. A shallow, ragged breath. Then another. Spontaneous circulation.",
      "Fire rescue arrives. They cut the roof. You work together to extract him — spinal precautions, C-collar, backboard.",
      "In the ambulance, his vitals stabilize. Pulse: 110. BP: 90/60. He's alive because you chose airway first.",
      "Later, at the hospital, the doctor tells you: 'If you had waited for extraction, he would have been brain dead in three minutes.'",
      "You walk out of the ER at dawn. The rain has stopped. The sky is turning pink.",
      "You did your job. You saved a life. But the next call is already coming in."
    ]
  },
  {
    "id": "extract-first",
    "label": "Extract First",
    "description": "You prioritize removing him from the vehicle. A dangerous gamble.",
    "type": "process",
    "positionX": 200,
    "positionY": 300,
    "content": [
      "You decide the car is too unstable. Gasoline is pooling. One spark and this entire scene becomes an inferno.",
      "You step back and call for fire rescue. 'Priority extraction. Vehicle unstable. Possible fire risk.'",
      "The minutes crawl by. You check the driver through the window. His breathing is getting worse — shallower, irregular. Agonal breathing.",
      "You radio again. 'Fire rescue ETA?' 'Two minutes.'",
      "The man stops breathing.",
      "You reach in and try to bag him through the window — but the angle is wrong. You can't get a seal. The glass is digging into your arm. Blood — yours or his — makes your grip slip.",
      "Fire rescue arrives at three minutes and twenty seconds. They cut the door. You pull him out.",
      "You start CPR on the stretcher. Your partner does compressions. You bag. The monitor shows PEA — pulseless electrical activity. A bad sign.",
      "You work him for eighteen minutes. Multiple rounds of epinephrine. No change.",
      "At the hospital, the attending calls it. Time of death: 3:28 AM.",
      "You stand in the hallway. The family arrives. You hear a mother's scream from the waiting room.",
      "The coroner will list cause of death as hypoxia due to delayed airway management.",
      "You replay the scene in your head. If you had started breathing for him immediately... but you can't think like that. You made the call. The car could have burned. You did what you thought was right.",
      "But the what-if will stay with you forever."
    ]
  },
  {
    "id": "lesson",
    "label": "The Lesson",
    "description": "Debrief: what every first responder must know about the golden minute.",
    "type": "end",
    "positionX": 0,
    "positionY": 600,
    "content": [
      "This scenario taught a critical principle of emergency medicine: the ABC protocol.",
      "Airway — Breathing — Circulation. In that order. Always.",
      "A patient can survive blood loss for minutes. But without oxygen, brain damage begins in three minutes.",
      "The 'Golden Minute' — the first sixty seconds after a patient stops breathing — is the most critical window in emergency care.",
      "Fire rescue and extraction are important. But airway management comes first.",
      "Key takeaway: In any emergency — medical, business, or technical — prioritize the thing that will kill you fastest. Not the thing that looks most urgent.",
      "The same principle applies to:",
      "- A startup: cash flow (airway) comes before marketing (circulation)",
      "- A server outage: restoring service (airway) before investigating root cause (circulation)",
      "- A negotiation: establishing trust (airway) before discussing price (circulation)",
      "The scenario you just experienced is based on real EMS protocols from the American Heart Association and National EMS Scope of Practice.",
      "Every decision had a consequence. That's how you learn."
    ]
  }
]
Field rules:
- "id": lowercase-kebab, unique — the SOUL of the scenario (e.g. "airway-first", "extract-first")
- "label": 1-3 words, capitalized — the name of the scenario chapter
- "description": 1 sentence — the situation presented to the user
- "type": exactly "start", "process", or "end"
- "positionX" / "positionY": controls flow direction (see spacing below)
- "content": array of 15-25 short paragraphs — each is a beat in the scenario, written in second person ("you"). Each content array MUST end with clear choice options (Choice A / Choice B format) for branching nodes.
- Structure: 1 start → N process → 1+ end nodes (each end has its own unique resolution/lesson)
- Branches can MERGE back together (e.g., node a → b and a → c, then b + c → d) when the scenario converges
- Flow goes top-to-bottom (Y increases downward).
Spacing rules:
- START: positionX = 0, positionY = 0
- PROCESS: positionY increases by 200-300 per depth level; positionX varies by -200 to 400 for branching arcs at same depth
- END: positionY = last process Y + 200-300, positionX varies by -200 to 400 for multiple endings

###EDGES###
[
  { "source": "the-crash", "target": "airway-first", "label": "prioritize airway", "animated": true },
  { "source": "the-crash", "target": "extract-first", "label": "prioritize extraction", "animated": true },
  { "source": "airway-first", "target": "lesson", "label": "survives", "animated": true },
  { "source": "extract-first", "target": "lesson", "label": "code called", "animated": true }
]
Rules:
- EVERY node must have at least one edge connecting it. A node with no edges is REJECTED.
- LINEAR chain example: node-a → node-b → node-c → node-d (each node connects to the next)
- BRANCHING example: node-a → node-b AND node-a → node-c (same source, two targets) — this is how choices are represented
- MERGING example: node-b → node-d AND node-c → node-d (two sources, same target) — different paths converge to a shared lesson
- All "source" and "target" values must match node "id" values exactly
- "label": 1-3 words describing the choice or consequence
- "animated": always true
- No cycles, no dead ends — every node must trace a path to at least one END node

###QUESTIONS###
[
  {
    "question": "In the ABC protocol, what does 'A' stand for and why is it prioritized first?",
    "options": ["Alertness — check consciousness first", "Airway — because oxygen deprivation causes brain damage in minutes", "Assessment — evaluate the full scene before acting", "Ambulance — call for transport immediately"],
    "correctAnswer": 1,
    "explanation": "Airway is first because without oxygen, brain damage begins in 3 minutes. You can survive longer without circulation than without breathing."
  },
  {
    "question": "What does the 'Golden Minute' refer to in emergency response?",
    "options": ["The first minute after arriving at the scene to make a decision", "The minute before the patient stops breathing", "The first 60 seconds after a patient stops breathing — the critical window for intervention", "The minute it takes for an ambulance to arrive"],
    "correctAnswer": 2,
    "explanation": "The Golden Minute is the first 60 seconds after respiratory arrest. Every second without intervention reduces survival odds by 10%."
  }
]
=== END OF FORMAT ===

WARNING: Your output is parsed by a machine. If you omit ANY marker (###TITLE###, ###DESC###, ###NODES###, ###EDGES###, ###QUESTIONS###), the entire response will be REJECTED. The "id" values in NODES must exactly match "source"/"target" values in EDGES.

REQUIREMENTS:
- Title: 2-7 words, unique (not in ALREADY COVERED TOPICS)
- 10-20 nodes: 1 "start" → 1-N "process" → 1+ "end"
- Each node "content": 15-25 short paragraphs — written in SECOND PERSON ("you"), 1 paragraph = 1 beat. Each process node content must end with clear Choice A / Choice B options.
- Each node "label": 1-3 words, name of the scenario chapter
- EDGES: EVERY node must have an edge. Each branching choice gets one edge per option. Count your edges: total edges = total connections between nodes.
- BRANCHING IS REQUIRED — every process node should have 2+ outgoing edges representing choices. A linear chain with no branches is REJECTED.
- MERGING IS ENCOURAGED — different choices can lead to the same lesson node.
- Multiple END nodes: each end has its own unique resolution with a debrief/lesson
- Node spacing: Y gap = 200-300, X gap = -200 to 400 for branching
- 2-5 questions, correctAnswer is 0-based index
- SCENARIO QUALITY — Every paragraph must be written in SECOND PERSON ("you"). Use immersive sensory details. Make every choice feel consequential. The lesson at the end must tie back to real-world principles.
- CRITICAL: NEVER use third-person named protagonists. NEVER write literary fiction. This is an interactive simulation, not a story. The user is the one making decisions. Write directly to them.
- Each scenario must have at least one branching point with 2+ choices. Linear scenarios with no choices are REJECTED.
- The start node sets up the scenario. Each process node represents a consequence of the previous choice. End nodes provide debrief and lessons learned.
- Keep language sharp, immediate, and urgent. Short paragraphs. High stakes. Every beat must advance the scenario and make the user feel the weight of their decision.`;
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
