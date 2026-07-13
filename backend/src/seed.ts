import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { slugify } from "./lib/transform";

interface SeedNode {
  id: string;
  positionX: number;
  positionY: number;
  label: string;
  description?: string;
  content?: string | string[];
  slug?: string;
  type?: string;
}

interface SeedEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.quizAttempt.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.reflection.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.question.deleteMany();
  await prisma.moduleEdge.deleteMany();
  await prisma.moduleNode.deleteMany();
  await prisma.module.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@1section.com" },
    update: {
      name: "Demo User",
      subscriptionStatus: "FREE",
    },
    create: {
      email: "demo@1section.com",
      name: "Demo User",
      passwordHash: null,
      subscriptionStatus: "FREE",
    },
  });
  console.log(`Created demo user: ${demoUser.email}`);

  // Seed demo payments
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.payment.createMany({
    data: [
      {
        userId: demoUser.id,
        lsOrderId: "demo-order-monthly",
        amount: 1000,
        currency: "USD",
        status: "SUCCEEDED",
        planType: "MONTHLY",
        createdAt: thirtyDaysAgo,
      },
    ],
  });
  console.log("Seeded demo payments");

  // Create admin user
  const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD || crypto.randomBytes(16).toString("hex");
  if (process.env.NODE_ENV === "development") {
    console.log(`Admin password: ${adminSeedPassword}`);
  }
  const adminPassword = await bcrypt.hash(adminSeedPassword, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "imuhammadabduh@gmail.com" },
    update: {
      name: "Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
    create: {
      email: "imuhammadabduh@gmail.com",
      name: "Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`Created admin user: ${adminUser.email}`);

  function makeNodes(modSlug: string, nodes: SeedNode[]) {
    return nodes.map((n) => ({
      ...n,
      id: `${modSlug}-${n.id}`,
    }));
  }
  function makeEdges(modSlug: string, edges: SeedEdge[]) {
    return edges.map((e) => ({
      ...e,
      id: `${modSlug}-${e.id}`,
      source: `${modSlug}-${e.source}`,
      target: `${modSlug}-${e.target}`,
    }));
  }

  function ensureUniqueSlugs(items: { label: string }[]): { slug: string }[] {
    const seen = new Map<string, number>();
    return items.map((item) => {
      const base = slugify(item.label);
      if (!base) return { slug: "node" };
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      return { slug: count === 0 ? base : `${base}-${count}` };
    });
  }

  function nodeDescription(label: string): string {
    const templates = [
      `This section covers ${label.toLowerCase()} and the key ideas you need to understand.`,
      `Learn about ${label.toLowerCase()} and how it applies in real world scenarios.`,
      `Explore ${label.toLowerCase()} and discover practical ways to apply this concept.`,
    ];
    return templates[label.length % templates.length];
  }

  function generateNodeContent(label: string, moduleTitle: string): string[] {
    const hash = (label + moduleTitle).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const scenarios = [
      [
        `You find yourself in a situation where ${moduleTitle.toLowerCase()} suddenly matters. The room is quiet. Everyone is waiting for your move.`,
        `Your hands are steady, but your mind is racing. You've read about this. You've practiced. But now it's real.`,
        `You remember the first principle: start with what you know. The basics are your anchor in unfamiliar waters.`,
        `You take a breath. The air smells like coffee and old books. The clock on the wall ticks loudly.`,
        `You make your first move. It's not perfect — but perfection was never the goal. Progress is.`,
        `The result surprises you. Not because it's amazing — but because you actually did it. The gap between thinking and doing just got smaller.`,
        `This moment changes something. You realize that every expert was once a beginner who refused to stop trying.`,
        `You look around. The world hasn't changed — but you have. The same room feels different now.`,
        `Your phone buzzes. A notification you would have checked immediately. Now you ignore it. Priorities have shifted.`,
        `You take a sip of water. Your throat was dry from tension you didn't even notice.`,
        `Someone asks if you're okay. You smile. You're more than okay — you're growing.`,
        `The next challenge appears. It's bigger than the last. But this time, you don't hesitate.`,
        `You tackle it head-on. Your hands move with purpose. Each action flows into the next, smooth and natural.`,
        `You make a mistake. It stings. But instead of spiraling, you analyze it. What went wrong? What can you learn?`,
        `The answer comes quickly because you're paying attention now. You're not on autopilot anymore.`,
        `You adjust your approach. The mistake becomes a stepping stone instead of a stumbling block.`,
        `Someone watching might think you planned this detour all along. You didn't. But you adapted. That's the skill.`,
        `You realize that mastery isn't about never failing — it's about failing forward. Each miss teaches you where the target really is.`,
        `You push further. The resistance you felt earlier is fading. What was hard is becoming natural.`,
        `The next time you face this situation, you'll know exactly what to do. Not because you memorized it — because you lived it.`,
      ],
      [
        `You stand at a crossroads. Behind you is everything familiar. Ahead is ${moduleTitle.toLowerCase()} — unknown but promising.`,
        `Your phone buzzes. A friend messages: "Don't overthink it." Easy for them to say. They're not the one taking the risk.`,
        `You feel the weight of the decision in your chest. Your palms are slightly sweaty.`,
        `You think about what could go wrong. Then you think about what could go right. The second list is longer.`,
        `You step forward. Not a leap — a step. The ground holds. You keep going.`,
        `An hour later, you look back and laugh at how scared you were. The monster in your head was made of shadows.`,
        `You learn something crucial: courage isn't the absence of fear. It's being afraid and doing it anyway.`,
        `A stranger notices your progress and asks for advice. You're not an expert yet — but you're further ahead than them.`,
        `You explain what you've learned so far. In teaching, you understand it deeper yourself.`,
        `The sun is setting. You've been at this for hours without noticing. Time flies when you're fully engaged.`,
        `You check your phone. Messages you would have replied to instantly are still unread. You don't care.`,
        `You realize the hardest part wasn't the work — it was deciding to start. Everything after that was just momentum.`,
        `A new person enters the picture. They challenge your approach. Your first instinct is to defend. Instead, you listen.`,
        `Their perspective reveals a blind spot. You were so focused on moving forward that you didn't see the cliff ahead.`,
        `You course-correct. It's humbling, but humility is the price of growth. You pay it willingly.`,
        `The revised path is better. Stronger. You would never have found it without someone who saw what you couldn't.`,
        `You make a note: seek perspectives that differ from yours. Comfortable agreement breeds invisible mistakes.`,
        `The work continues. Each iteration makes you sharper. Each conversation adds a tool to your mental toolkit.`,
        `Fatigue sets in. Your eyelids are heavy. But you're close to a breakthrough. You push through the wall.`,
        `When you finally stop, the satisfaction isn't in the result — it's in who you became to achieve it.`,
      ],
      [
        `You're in the middle of it now. ${moduleTitle.toLowerCase()} is harder than you expected. Everything that could go wrong is going wrong.`,
        `Your laptop freezes. Your coffee spills. Your phone rings with bad news. The universe seems to be testing you.`,
        `You want to quit. The thought crosses your mind like a dark cloud: "This isn't for me."`,
        `But then you remember why you started. The reason was bigger than the discomfort.`,
        `You take a different approach. Instead of fighting the problem, you work around it.`,
        `The shift in perspective changes everything. What felt like a wall was really just a door you hadn't noticed.`,
        `You keep going. Not because it's easy — but because you're becoming someone who doesn't quit.`,
        `Sweat drips down your forehead. Your muscles ache. Your eyes are tired. But there's a fire inside that won't go out.`,
        `You hit another obstacle. This one is different — it requires help. You reach out to someone.`,
        `The conversation changes everything. A perspective you never considered opens a new path forward.`,
        `You realize that going alone gets you far. Going together gets you further.`,
        `The breakthrough comes when you least expect it. A simple idea. A tiny adjustment. Everything clicks.`,
        `But the breakthrough creates new problems. The solution to one issue reveals two more underneath.`,
        `You feel a flash of frustration. You were supposed to be done. Instead, you're deeper in the weeds.`,
        `Then you remember: complexity is a sign you're close to the root. Surface problems are simple. Deep problems reveal the structure beneath.`,
        `You take a step back. Instead of attacking symptoms, you map the system. Where is the real leverage point?`,
        `The map reveals something you missed. A single change upstream would have prevented all the downstream chaos.`,
        `You make the change. It feels small — almost too simple. But the ripple effect is immediate.`,
        `Problems start solving themselves. Not because you fixed them, but because you fixed the source.`,
        `You sit back. For the first time in hours, you breathe deeply. The system is running smoothly now. You didn't fight the fire — you turned off the gas.`,
      ],
    ];
    const i = Math.abs(hash);
    const s = scenarios[i % scenarios.length];
    return s.map((p, idx) => idx === 0 ? p : p);
  }

  function generateScenario(title: string) {
    const hash = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const scenarios: Array<{ nodes: { id: string; positionX: number; positionY: number; label: string; type?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }> = [
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: `The ${title} Challenge`, type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Follow Conventional Path", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Try a Bold Approach", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Safe but Slow Progress", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Get Stuck in Analysis", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Early Wins Build Momentum", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Face Unexpected Obstacle", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Frustration Builds", type: "process" },
          { id: "9", positionX: 300, positionY: 600, label: "Hit a Plateau", type: "process" },
          { id: "10", positionX: 700, positionY: 600, label: "Pivot the Strategy", type: "process" },
          { id: "11", positionX: 300, positionY: 800, label: "Give Up Too Early", type: "end" },
          { id: "12", positionX: 700, positionY: 800, label: `Master ${title}`, type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Safe path" },
          { id: "e1-3", source: "1", target: "3", label: "Bold path" },
          { id: "e2-4", source: "2", target: "4" },
          { id: "e2-5", source: "2", target: "5" },
          { id: "e3-6", source: "3", target: "6" },
          { id: "e3-7", source: "3", target: "7" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-8", source: "5", target: "8" },
          { id: "e6-9", source: "6", target: "9" },
          { id: "e7-10", source: "7", target: "10" },
          { id: "e8-11", source: "8", target: "11" },
          { id: "e9-11", source: "9", target: "11" },
          { id: "e10-12", source: "10", target: "12" },
        ],
      },
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "You Face a Decision", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Go With What You Know", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Learn a New Approach", type: "process" },
          { id: "4", positionX: 0, positionY: 400, label: "Comfort Zone — No Growth", type: "process" },
          { id: "5", positionX: 200, positionY: 400, label: "Tweak Existing Method", type: "process" },
          { id: "6", positionX: 600, positionY: 400, label: "Struggle With New Skills", type: "process" },
          { id: "7", positionX: 800, positionY: 400, label: "Rapid Progress", type: "process" },
          { id: "8", positionX: 0, positionY: 600, label: "Boredom and Regret", type: "process" },
          { id: "9", positionX: 200, positionY: 600, label: "Moderate Results", type: "process" },
          { id: "10", positionX: 600, positionY: 600, label: "Breakthrough Moment", type: "process" },
          { id: "11", positionX: 0, positionY: 800, label: "Stagnation", type: "end" },
          { id: "12", positionX: 400, positionY: 800, label: "Acceptable Outcome", type: "end" },
          { id: "13", positionX: 800, positionY: 800, label: "Transformation Achieved", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Familiar" },
          { id: "e1-3", source: "1", target: "3", label: "Unfamiliar" },
          { id: "e2-4", source: "2", target: "4", label: "Do nothing new" },
          { id: "e2-5", source: "2", target: "5", label: "Small adjustment" },
          { id: "e3-6", source: "3", target: "6", label: "Struggle" },
          { id: "e3-7", source: "3", target: "7", label: "Natural talent" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-10", source: "7", target: "10" },
          { id: "e8-11", source: "8", target: "11" },
          { id: "e9-12", source: "9", target: "12" },
          { id: "e10-13", source: "10", target: "13" },
        ],
      },
    ];
    const scenario = scenarios[hash % scenarios.length];
    const layoutSlugs = ensureUniqueSlugs(scenario.nodes.map((n) => ({ label: n.label })));
    const nodes = scenario.nodes.map((n, i) => ({
      ...n,
      type: n.type || "process",
      description: n.label.includes(title) ? `You encounter a situation that tests your understanding of ${title}.` : `${n.label} — a turning point in your ${title} journey.`,
      content: generateNodeContent(n.label, title),
      slug: layoutSlugs[i].slug,
    }));
    const edges = scenario.edges.map((e) => ({ ...e }));
    return { nodes, edges };
  }

  function generateQuestions(title: string) {
    const scenarios = [
      {
        question: `What is the most important first step when applying "${title}"?`,
        options: [
          `Wait until you fully understand everything before starting`,
          `Take immediate action with what you already know, then adjust`,
          `Ask someone else to do it for you`,
          `Read more books about it before trying`,
        ],
        correctAnswer: 1,
        explanation: `The paradox of ${title.toLowerCase()} is that you can't learn it without doing it. Action comes first, understanding follows.`,
      },
      {
        question: `What is the biggest mistake people make when learning "${title}"?`,
        options: [
          `They practice too much`,
          `They wait for perfect conditions instead of starting imperfectly`,
          `They ask too many questions`,
          `They focus only on theory`,
        ],
        correctAnswer: 1,
        explanation: `Waiting for perfect conditions is just procrastination in disguise. The perfect moment never comes — start now, with what you have.`,
      },
    ];
    const hash = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return [scenarios[hash % scenarios.length]];
  }

  // Full modules data — scenario-based simulations
  const modulesData = [
    {
      slug: "er-triage-decision",
      title: "ER Triage: Code Blue",
      description: "You are an ER doctor. A patient arrives with chest pain and dropping BP. Every second counts.",
      category: "mindset",
      content: `You are on your third cup of coffee when the ambulance bay doors burst open. A 58-year-old man, pale and clammy, gasps on the stretcher. Heart rate 140. BP 70/40. He's crashing, and every decision from here changes the outcome.`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "Patient Arrives", type: "start" },
        { id: "2", positionX: 100, positionY: 200, label: "Check Airway First", type: "process" },
        { id: "3", positionX: 700, positionY: 200, label: "Start IV Fluids Wide Open", type: "process" },
        { id: "4", positionX: -200, positionY: 400, label: "Intubate Patient", type: "process" },
        { id: "5", positionX: 100, positionY: 400, label: "Patient Stabilizes", type: "process" },
        { id: "6", positionX: 500, positionY: 400, label: "BP Still Dropping", type: "process" },
        { id: "7", positionX: 900, positionY: 400, label: "Fluids Help Slightly", type: "process" },
        { id: "8", positionX: -200, positionY: 600, label: "Missed Tamponade Diagnosis", type: "process" },
        { id: "9", positionX: 100, positionY: 600, label: "Call Cardiology", type: "process" },
        { id: "10", positionX: 500, positionY: 600, label: "Push Epinephrine", type: "process" },
        { id: "11", positionX: 900, positionY: 600, label: "Order Bedside Echo", type: "process" },
        { id: "12", positionX: 100, positionY: 800, label: "Patient Admitted, Survives", type: "end" },
        { id: "13", positionX: 500, positionY: 800, label: "Code Blue Called", type: "end" },
        { id: "14", positionX: 900, positionY: 800, label: "Diagnosis: Pericardial Tamponade", type: "end" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Prioritize airway" },
        { id: "e1-3", source: "1", target: "3", label: "Prioritize circulation" },
        { id: "e2-4", source: "2", target: "4", label: "Intubate" },
        { id: "e2-5", source: "2", target: "5", label: "Wait and monitor" },
        { id: "e3-6", source: "3", target: "6", label: "BP still low" },
        { id: "e3-7", source: "3", target: "7", label: "BP responds" },
        { id: "e4-8", source: "4", target: "8", label: "Focus on vent" },
        { id: "e5-9", source: "5", target: "9", label: "Stable enough" },
        { id: "e6-10", source: "6", target: "10", label: "Push epi" },
        { id: "e7-11", source: "7", target: "11", label: "Get echo" },
        { id: "e8-13", source: "8", target: "13", label: "Crash" },
        { id: "e9-12", source: "9", target: "12", label: "Admit" },
        { id: "e10-13", source: "10", target: "13", label: "No response" },
        { id: "e11-14", source: "11", target: "14", label: "Tamponade found" },
      ],
      questions: [
        {
          question: "In a crashing patient with hypotension and tachycardia, what is the MOST likely diagnosis until proven otherwise?",
          options: ["Panic attack", "Obstructive shock (tamponade, tension pneumothorax)", "Dehydration", "Drug overdose"],
          correctAnswer: 1,
          explanation: "Hypotension + tachycardia + muffled heart sounds = Beck's triad for tamponade. Always consider obstructive shock in a crashing patient."
        },
        {
          question: "Why did the patient crash when fluids were pushed without diagnosing the underlying cause?",
          options: ["Fluids are always the right answer", "Fluids can worsen tamponade by increasing pressure on the heart", "The patient was allergic to saline", "IV fluids cause heart attacks"],
          correctAnswer: 1,
          explanation: "In pericardial tamponade, fluid resuscitation increases venous pressure without improving cardiac output, potentially worsening the tamponade physiology."
        },
      ],
    },
    {
      slug: "startup-founder-decision",
      title: "Coffee Shop or SaaS?",
      description: "You have Rp10 juta. Do you start a coffee shop, a laundry, or build a SaaS? Each path teaches real business lessons.",
      category: "clarity",
      content: `You've saved Rp10 juta over two years of freelancing. Your savings account shows the number: 10,000,000. It's not much — but it's enough to start something. Your friend says coffee shops are booming. Your mom says laundry is safe. Your tech friend says build software. Who's right?`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "Rp10 Juta in Hand", type: "start" },
        { id: "2", positionX: -100, positionY: 200, label: "Open Coffee Shop", type: "process" },
        { id: "3", positionX: 400, positionY: 200, label: "Start Laundry Service", type: "process" },
        { id: "4", positionX: 900, positionY: 200, label: "Build a SaaS Product", type: "process" },
        { id: "5", positionX: -200, positionY: 400, label: "Rent a Booth — Rp7jt Gone", type: "process" },
        { id: "6", positionX: 0, positionY: 400, label: "Pop-Up Strategy", type: "process" },
        { id: "7", positionX: 300, positionY: 400, label: "Buy 2 Washing Machines", type: "process" },
        { id: "8", positionX: 500, positionY: 400, label: "Manual Service First", type: "process" },
        { id: "9", positionX: 800, positionY: 400, label: "Hire Freelance Dev", type: "process" },
        { id: "10", positionX: 900, positionY: 400, label: "No-Code MVP", type: "process" },
        { id: "11", positionX: -200, positionY: 600, label: "Bankrupt in 3 Months", type: "end" },
        { id: "12", positionX: 0, positionY: 600, label: "Break-Even in Month 2", type: "end" },
        { id: "13", positionX: 300, positionY: 600, label: "Slow Growth, Low Margin", type: "end" },
        { id: "14", positionX: 500, positionY: 600, label: "Profitable by Month 3", type: "end" },
        { id: "15", positionX: 800, positionY: 600, label: "Cash Ran Out", type: "end" },
        { id: "16", positionX: 900, positionY: 600, label: "MVP Launched, 10 Users", type: "end" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Coffee" },
        { id: "e1-3", source: "1", target: "3", label: "Laundry" },
        { id: "e1-4", source: "1", target: "4", label: "SaaS" },
        { id: "e2-5", source: "2", target: "5", label: "Rent big space" },
        { id: "e2-6", source: "2", target: "6", label: "Start small" },
        { id: "e3-7", source: "3", target: "7", label: "Buy equipment" },
        { id: "e3-8", source: "3", target: "8", label: "Manual partner" },
        { id: "e4-9", source: "4", target: "9", label: "Hire dev" },
        { id: "e4-10", source: "4", target: "10", label: "Build yourself" },
        { id: "e5-11", source: "5", target: "11" },
        { id: "e6-12", source: "6", target: "12" },
        { id: "e7-13", source: "7", target: "13" },
        { id: "e8-14", source: "8", target: "14" },
        { id: "e9-15", source: "9", target: "15" },
        { id: "e10-16", source: "10", target: "16" },
      ],
      questions: [
        {
          question: "What is the #1 reason new coffee shops fail within the first year?",
          options: ["Bad coffee beans", "High rent and low margin", "Too many customers", "Poor location"],
          correctAnswer: 1,
          explanation: "Coffee shops have thin margins (10-15%). Rent eats 30-40% of revenue. A slow month can wipe you out."
        },
        {
          question: "What is the 'lean startup' principle demonstrated by the no-code SaaS path?",
          options: ["Build everything before launch", "Validate with the smallest possible product first", "Raise venture capital immediately", "Hire as many people as possible"],
          correctAnswer: 1,
          explanation: "The lean startup method: build an MVP (minimum viable product) with minimal resources to test demand before investing heavily."
        },
      ],
    },
    {
      slug: "morning-habit-battle",
      title: "The 5 AM Decision",
      description: "Your alarm goes off at 5 AM. You have one decision that sets the tone for your entire day. What do you do?",
      category: "habit",
      content: `Beep. Beep. Beep. Your phone screams at you from the nightstand. 5:00 AM. The room is dark. The blanket is warm. Your brain offers a dozen reasons to stay in bed. But yesterday, you set this alarm with conviction. The choice you make in the next 10 seconds will determine everything.`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "5 AM Alarm Rings", type: "start" },
        { id: "2", positionX: 100, positionY: 200, label: "Hit Snooze", type: "process" },
        { id: "3", positionX: 700, positionY: 200, label: "Get Up Immediately", type: "process" },
        { id: "4", positionX: -100, positionY: 400, label: "Snooze Once...", type: "process" },
        { id: "5", positionX: 300, positionY: 400, label: "Snooze Three Times", type: "process" },
        { id: "6", positionX: 600, positionY: 400, label: "Drink Water, Start Routine", type: "process" },
        { id: "7", positionX: 900, positionY: 400, label: "Check Phone First", type: "process" },
        { id: "8", positionX: -100, positionY: 600, label: "Wake Up Late, Rush", type: "process" },
        { id: "9", positionX: 200, positionY: 600, label: "Wake Up at 7, Miss Workout", type: "process" },
        { id: "10", positionX: 500, positionY: 600, label: "Meditate 5 Min", type: "process" },
        { id: "11", positionX: 800, positionY: 600, label: "Exercise 20 Min", type: "process" },
        { id: "12", positionX: 200, positionY: 800, label: "Rushed, Stressed Day", type: "end" },
        { id: "13", positionX: 500, positionY: 800, label: "Calm, Productive Day", type: "end" },
        { id: "14", positionX: 800, positionY: 800, label: "Scattered, Unfocused", type: "end" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Snooze" },
        { id: "e1-3", source: "1", target: "3", label: "Get up" },
        { id: "e2-4", source: "2", target: "4", label: "One more time" },
        { id: "e2-5", source: "2", target: "5", label: "Keep sleeping" },
        { id: "e3-6", source: "3", target: "6", label: "Start routine" },
        { id: "e3-7", source: "3", target: "7", label: "Check phone" },
        { id: "e4-8", source: "4", target: "8", label: "Oversleep" },
        { id: "e5-9", source: "5", target: "9", label: "Missed morning" },
        { id: "e6-10", source: "6", target: "10", label: "Meditate" },
        { id: "e6-11", source: "6", target: "11", label: "Exercise" },
        { id: "e7-14", source: "7", target: "14", label: "Phone rabbit hole" },
        { id: "e8-12", source: "8", target: "12" },
        { id: "e9-12", source: "9", target: "12" },
        { id: "e10-13", source: "10", target: "13" },
        { id: "e11-13", source: "11", target: "13" },
      ],
      questions: [
        {
          question: "Why does checking your phone first thing in the morning reduce productivity?",
          options: ["Phones emit radiation", "It triggers a reactive dopamine loop, setting a distracted tone", "The screen is too bright", "You might see bad news"],
          correctAnswer: 1,
          explanation: "Checking your phone first thing activates your dopamine system for reactive consumption rather than proactive creation. This is called 'morning momentum hijacking.'"
        },
        {
          question: "What is the 'decision fatigue' principle at play when you hit snooze?",
          options: ["Snoozing gives you more energy", "Each snooze is a micro-decision that drains willpower", "Snoozing improves sleep quality", "Snoozing is good for memory"],
          correctAnswer: 1,
          explanation: "Every decision — even 'snooze or get up' — depletes your limited willpower reserves. Making the first decision the right one preserves energy for the rest of the day."
        },
      ],
    },
    {
      slug: "distraction-or-deep-work",
      title: "The Notification Trap",
      description: "You have 3 hours to finish a critical report. Your phone buzzes. Your email pings. Your coworker stops by. What do you do?",
      category: "focus",
      content: `It's 9 AM. You have a report due at noon. This report could determine whether your team gets the Q4 budget. You open your laptop. Then: buzz (Slack). Ping (email). Knock (coworker: "Got a minute?"). Your focus is a fragile flame — and the world is a windstorm.`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "Start Report — 3 Hours Left", type: "start" },
        { id: "2", positionX: 100, positionY: 200, label: "Check Every Notification", type: "process" },
        { id: "3", positionX: 400, positionY: 200, label: "Help Coworker First", type: "process" },
        { id: "4", positionX: 700, positionY: 200, label: "Focus Mode: Phone Off", type: "process" },
        { id: "5", positionX: -100, positionY: 400, label: "Reply to All", type: "process" },
        { id: "6", positionX: 100, positionY: 400, label: "Skim and Ignore", type: "process" },
        { id: "7", positionX: 300, positionY: 400, label: "Help for 5 Min...", type: "process" },
        { id: "8", positionX: 500, positionY: 400, label: "Set a Boundary", type: "process" },
        { id: "9", positionX: 800, positionY: 400, label: "Pomodoro: 25 Min Blocks", type: "process" },
        { id: "10", positionX: 1000, positionY: 400, label: "Flow State: 2 Hours", type: "process" },
        { id: "11", positionX: -100, positionY: 600, label: "11 AM: Only Intro Written", type: "process" },
        { id: "12", positionX: 300, positionY: 600, label: "11 AM: 1 Hour Lost", type: "process" },
        { id: "13", positionX: 700, positionY: 600, label: "11 AM: Halfway Done", type: "process" },
        { id: "14", positionX: -100, positionY: 800, label: "Panic: Turn in Half Draft", type: "end" },
        { id: "15", positionX: 300, positionY: 800, label: "Request Extension", type: "end" },
        { id: "16", positionX: 700, positionY: 800, label: "Report Complete, Confident", type: "end" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Respond" },
        { id: "e1-3", source: "1", target: "3", label: "Help" },
        { id: "e1-4", source: "1", target: "4", label: "Deep work" },
        { id: "e2-5", source: "2", target: "5", label: "Reply all" },
        { id: "e2-6", source: "2", target: "6", label: "Quick skim" },
        { id: "e3-7", source: "3", target: "7", label: "Get pulled in" },
        { id: "e3-8", source: "3", target: "8", label: "Set boundary" },
        { id: "e4-9", source: "4", target: "9", label: "Pomodoro" },
        { id: "e4-10", source: "4", target: "10", label: "Flow state" },
        { id: "e5-11", source: "5", target: "11" },
        { id: "e6-12", source: "6", target: "12" },
        { id: "e7-12", source: "7", target: "12" },
        { id: "e8-13", source: "8", target: "13" },
        { id: "e9-13", source: "9", target: "13" },
        { id: "e10-13", source: "10", target: "13" },
        { id: "e11-14", source: "11", target: "14" },
        { id: "e12-15", source: "12", target: "15" },
        { id: "e13-16", source: "13", target: "16" },
      ],
      questions: [
        {
          question: "What is the 'attention residue' effect described in the scenario?",
          options: ["Leftover focus after finishing a task", "When you partially switch tasks, part of your attention stays on the previous task", "Attention span after drinking coffee", "The ability to multitask effectively"],
          correctAnswer: 1,
          explanation: "Attention residue means when you switch tasks, a part of your brain is still processing the previous task. It takes ~23 minutes to fully refocus after an interruption."
        },
        {
          question: "Why does checking notifications early in a work session cause disproportionate damage?",
          options: ["Notifications are addictive", "Interruptions during the 'activation energy' phase prevent entering flow state entirely", "The phone runs out of battery", "Notifications make you angry"],
          correctAnswer: 1,
          explanation: "The first 10-15 minutes of a work session are the 'activation energy' phase — the hardest part. Interruptions here reset the clock and make it exponentially harder to regain momentum."
        },
      ],
    },
    {
      slug: "time-audit-challenge",
      title: "Where Did Your Day Go?",
      description: "You track every hour for one day. The results shock you. Can you reclaim your time?",
      category: "productivity",
      content: `It's 8 PM and you feel exhausted. But when you think about what you actually accomplished today... nothing meaningful. You were busy, but not productive. The average person wastes 4+ hours per day on low-value activities. Are you above or below average? Let's find out.`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "6 AM: Start Tracking", type: "start" },
        { id: "2", positionX: 100, positionY: 200, label: "Scroll Social Media", type: "process" },
        { id: "3", positionX: 400, positionY: 200, label: "Check Email First", type: "process" },
        { id: "4", positionX: 700, positionY: 200, label: "Plan the Day", type: "process" },
        { id: "5", positionX: -100, positionY: 400, label: "45 Min Lost to Reels", type: "process" },
        { id: "6", positionX: 100, positionY: 400, label: "Email Rabbit Hole", type: "process" },
        { id: "7", positionX: 400, positionY: 400, label: "Do the Hardest Task", type: "process" },
        { id: "8", positionX: 700, positionY: 400, label: "Meetings Fill the Day", type: "process" },
        { id: "9", positionX: -100, positionY: 600, label: "10 AM: Still Not Working", type: "process" },
        { id: "10", positionX: 100, positionY: 600, label: "10 AM: Reacting, Not Creating", type: "process" },
        { id: "11", positionX: 400, positionY: 600, label: "10 AM: Deep Work Done", type: "process" },
        { id: "12", positionX: 700, positionY: 600, label: "10 AM: First Meeting Done", type: "process" },
        { id: "13", positionX: -100, positionY: 800, label: "End of Day: 0 Real Work", type: "end" },
        { id: "14", positionX: 100, positionY: 800, label: "Mid Afternoon Burnout", type: "end" },
        { id: "15", positionX: 400, positionY: 800, label: "4 PM: Core Work Complete", type: "end" },
        { id: "16", positionX: 700, positionY: 800, label: "5 PM: Productive but Reactive", type: "end" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Scroll" },
        { id: "e1-3", source: "1", target: "3", label: "Email" },
        { id: "e1-4", source: "1", target: "4", label: "Plan" },
        { id: "e2-5", source: "2", target: "5" },
        { id: "e3-6", source: "3", target: "6" },
        { id: "e4-7", source: "4", target: "7", label: "Eat the frog" },
        { id: "e4-8", source: "4", target: "8", label: "Check calendar" },
        { id: "e5-9", source: "5", target: "9" },
        { id: "e6-10", source: "6", target: "10" },
        { id: "e7-11", source: "7", target: "11" },
        { id: "e8-12", source: "8", target: "12" },
        { id: "e9-13", source: "9", target: "13" },
        { id: "e10-14", source: "10", target: "14" },
        { id: "e11-15", source: "11", target: "15" },
        { id: "e12-16", source: "12", target: "16" },
      ],
      questions: [
        {
          question: "What's the 'Eat the Frog' productivity technique?",
          options: ["Don't eat breakfast before work", "Do your hardest task first thing in the morning", "Take lunch at your desk", "Skip meetings to save time"],
          correctAnswer: 1,
          explanation: "'Eat the frog' means doing your most difficult and important task first, while your willpower is highest. After that, everything else feels easy."
        },
        {
          question: "What percentage of the workday does the average person spend on 'shallow work'?",
          options: ["10-20%", "60-80%", "30-40%", "90-100%"],
          correctAnswer: 1,
          explanation: "Studies show knowledge workers spend 60-80% of their day on shallow work (email, meetings, admin) — activities that don't require deep thinking and create little value."
        },
      ],
    },
    {
      slug: "negotiation-simulator",
      title: "The Salary Negotiation",
      description: "You just got a job offer. The number is lower than you expected. Do you accept, counter, or walk?",
      category: "strategy",
      content: `You've been interviewing for six weeks. You made it through four rounds. The offer email arrives. You open it, heart pounding. The salary: Rp12 juta/month. You were hoping for Rp15-18 juta. Your stomach drops. Now comes the hardest part of the process — the negotiation.`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "Offer: Rp12jt/month", type: "start" },
        { id: "2", positionX: 100, positionY: 200, label: "Accept Immediately", type: "process" },
        { id: "3", positionX: 400, positionY: 200, label: "Counter at Rp16jt", type: "process" },
        { id: "4", positionX: 700, positionY: 200, label: "Ask for More Time", type: "process" },
        { id: "5", positionX: -100, positionY: 400, label: "Secured the Job", type: "process" },
        { id: "6", positionX: 100, positionY: 400, label: "Start Resentment Builds", type: "process" },
        { id: "7", positionX: 300, positionY: 400, label: "They Counter at Rp14jt", type: "process" },
        { id: "8", positionX: 500, positionY: 400, label: "They Say No", type: "process" },
        { id: "9", positionX: 700, positionY: 400, label: "Research Market Rate", type: "process" },
        { id: "10", positionX: 900, positionY: 400, label: "Other Interviews Continue", type: "process" },
        { id: "11", positionX: -100, positionY: 600, label: "Underpaid by Rp3-6jt", type: "end" },
        { id: "12", positionX: 300, positionY: 600, label: "Accepted Rp14jt — Fair Deal", type: "end" },
        { id: "13", positionX: 900, positionY: 600, label: "Better Offer Comes: Rp17jt", type: "end" },
        { id: "14", positionX: 500, positionY: 600, label: "Offer Withdrawn", type: "end" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Accept" },
        { id: "e1-3", source: "1", target: "3", label: "Counter" },
        { id: "e1-4", source: "1", target: "4", label: "Delay" },
        { id: "e2-5", source: "2", target: "5", label: "Safe" },
        { id: "e2-6", source: "2", target: "6", label: "Regret" },
        { id: "e3-7", source: "3", target: "7", label: "They negotiate" },
        { id: "e3-8", source: "3", target: "8", label: "They walk" },
        { id: "e4-9", source: "4", target: "9", label: "Gather info" },
        { id: "e4-10", source: "4", target: "10", label: "Keep interviewing" },
        { id: "e5-11", source: "5", target: "11" },
        { id: "e6-11", source: "6", target: "11" },
        { id: "e7-12", source: "7", target: "12" },
        { id: "e8-14", source: "8", target: "14" },
        { id: "e9-12", source: "9", target: "12", label: "Counter with data" },
        { id: "e10-13", source: "10", target: "13" },
      ],
      questions: [
        {
          question: "In negotiation, what is the 'BATNA' concept?",
          options: ["Best Alternative To a Negotiated Agreement — your walkaway option", "A type of negotiation tactic", "The salary you should ask for", "A contract clause"],
          correctAnswer: 0,
          explanation: "BATNA is your best alternative if the negotiation fails. Having a strong BATNA (another offer) gives you leverage. Without one, you negotiate from weakness."
        },
        {
          question: "Why does accepting a low offer immediately often lead to job dissatisfaction?",
          options: ["Low salary means bad company", "The 'anchor' effect of a low starting salary affects future raises and bonuses", "You can't quit later", "Companies always lowball"],
          correctAnswer: 1,
          explanation: "Your starting salary anchors all future raises, bonuses, and even your next job offer. A Rp3jt difference compounds to millions over years."
        },
      ],
    },
    {
      slug: "creative-block",
      title: "The Empty Page",
      description: "You stare at a blank document. The cursor blinks. The deadline is tomorrow. Your mind is empty. What breaks the block?",
      category: "creativity",
      content: `The cursor blinks at you. Mocking you. It's 10 PM. Your article is due at 9 AM tomorrow. You've written three sentences and deleted all of them. Your coffee is cold. Your back hurts. The clock ticks. The page stays white. Creativity isn't a gift — it's a process. But right now, the process is broken.`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "Blank Page, 10 PM", type: "start" },
        { id: "2", positionX: 100, positionY: 200, label: "Force Yourself to Write", type: "process" },
        { id: "3", positionX: 400, positionY: 200, label: "Take a Walk First", type: "process" },
        { id: "4", positionX: 700, positionY: 200, label: "Scroll for Inspiration", type: "process" },
        { id: "5", positionX: -100, positionY: 400, label: "Write Terrible Draft", type: "process" },
        { id: "6", positionX: 100, positionY: 400, label: "Writer's Block Gets Worse", type: "process" },
        { id: "7", positionX: 300, positionY: 400, label: "Walk Clears Your Mind", type: "process" },
        { id: "8", positionX: 500, positionY: 400, label: "Get Distracted Outside", type: "process" },
        { id: "9", positionX: 700, positionY: 400, label: "Find Relevant Articles", type: "process" },
        { id: "10", positionX: 900, positionY: 400, label: "Doomscroll for 1 Hour", type: "process" },
        { id: "11", positionX: -100, positionY: 600, label: "Edit into Something Good", type: "process" },
        { id: "12", positionX: 100, positionY: 600, label: "Give Up, Go to Sleep", type: "process" },
        { id: "13", positionX: 300, positionY: 600, label: "Idea Hits Mid-Walk", type: "process" },
        { id: "14", positionX: 700, positionY: 600, label: "Structured Research Done", type: "process" },
        { id: "15", positionX: -100, positionY: 800, label: "Finished by 2 AM, Great Piece", type: "end" },
        { id: "16", positionX: 100, positionY: 800, label: "Panic at 6 AM, Rush Job", type: "end" },
        { id: "17", positionX: 300, positionY: 800, label: "Write Fluently Until Done", type: "end" },
        { id: "18", positionX: 700, positionY: 800, label: "Good Research, Late Writing", type: "end" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Force" },
        { id: "e1-3", source: "1", target: "3", label: "Step away" },
        { id: "e1-4", source: "1", target: "4", label: "Research" },
        { id: "e2-5", source: "2", target: "5", label: "Keep going" },
        { id: "e2-6", source: "2", target: "6", label: "Get stuck" },
        { id: "e3-7", source: "3", target: "7", label: "Focused walk" },
        { id: "e3-8", source: "3", target: "8", label: "Get distracted" },
        { id: "e4-9", source: "4", target: "9", label: "Focused search" },
        { id: "e4-10", source: "4", target: "10", label: "Scrolling" },
        { id: "e5-11", source: "5", target: "11" },
        { id: "e6-12", source: "6", target: "12" },
        { id: "e7-13", source: "7", target: "13" },
        { id: "e8-12", source: "8", target: "12" },
        { id: "e9-14", source: "9", target: "14" },
        { id: "e10-12", source: "10", target: "12" },
        { id: "e11-15", source: "11", target: "15" },
        { id: "e12-16", source: "12", target: "16" },
        { id: "e13-17", source: "13", target: "17" },
        { id: "e14-18", source: "14", target: "18" },
      ],
      questions: [
        {
          question: "What is the 'shitty first draft' concept and why does it work?",
          options: ["Write perfectly the first time", "Give yourself permission to write badly — you can't edit a blank page", "Delete everything and start over", "Only write when inspired"],
          correctAnswer: 1,
          explanation: "Anne Lamott's concept: perfectionism is the enemy of creativity. A terrible draft can be edited into something good. A blank page cannot."
        },
        {
          question: "Why does walking help overcome creative blocks?",
          options: ["Walking burns calories", "Walking activates the default mode network in your brain — the part responsible for creative connections", "Walking makes you tired enough to sleep", "Walking gives you time to listen to podcasts"],
          correctAnswer: 1,
          explanation: "Walking increases blood flow and activates the brain's default mode network, which is responsible for connecting disparate ideas. Many great insights come during walks, not while staring at a screen."
        },
      ],
    },
    {
      slug: "decision-under-pressure",
      title: "The Investor Pitch",
      description: "You have 3 minutes to convince an investor. Your startup's future depends on this moment. What do you say?",
      category: "learning",
      content: `You walk into a room. Three investors sit behind a table. One checks his watch. Another sips water, bored. The third — the decision-maker — stares at you. "You have 3 minutes. Go." Your heart hammers. Your palms sweat. Everything you've built for two years comes down to this moment. What's your move?`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "3 Minutes on the Clock", type: "start" },
        { id: "2", positionX: 100, positionY: 200, label: "Start with the Problem", type: "process" },
        { id: "3", positionX: 400, positionY: 200, label: "Lead with Traction", type: "process" },
        { id: "4", positionX: 700, positionY: 200, label: "Tell a Personal Story", type: "process" },
        { id: "5", positionX: -100, positionY: 400, label: "Explain Market Size", type: "process" },
        { id: "6", positionX: 100, positionY: 400, label: "Go into Solution Details", type: "process" },
        { id: "7", positionX: 300, positionY: 400, label: "Show Revenue Graph", type: "process" },
        { id: "8", positionX: 500, positionY: 400, label: "Mention Team Background", type: "process" },
        { id: "9", positionX: 700, positionY: 400, label: "Talk About Market Gap", type: "process" },
        { id: "10", positionX: 900, positionY: 400, label: "Emotional Hook — Why You Care", type: "process" },
        { id: "11", positionX: -100, positionY: 600, label: "Time's Up — Investor Looks Bored", type: "process" },
        { id: "12", positionX: 300, positionY: 600, label: "Investor Leans In: 'How much?'", type: "process" },
        { id: "13", positionX: 700, positionY: 600, label: "Investor Asks About Team", type: "process" },
        { id: "14", positionX: -100, positionY: 800, label: "Rejection: 'Not ready'", type: "end" },
        { id: "15", positionX: 300, positionY: 800, label: "Follow-Up Meeting Scheduled", type: "end" },
        { id: "16", positionX: 700, positionY: 800, label: "Term Sheet Offered", type: "end" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Problem-first" },
        { id: "e1-3", source: "1", target: "3", label: "Traction-first" },
        { id: "e1-4", source: "1", target: "4", label: "Story-first" },
        { id: "e2-5", source: "2", target: "5", label: "Market size" },
        { id: "e2-6", source: "2", target: "6", label: "Solution details" },
        { id: "e3-7", source: "3", target: "7", label: "Revenue focus" },
        { id: "e3-8", source: "3", target: "8", label: "Team focus" },
        { id: "e4-9", source: "4", target: "9", label: "Market gap" },
        { id: "e4-10", source: "4", target: "10", label: "Personal mission" },
        { id: "e5-11", source: "5", target: "11" },
        { id: "e6-11", source: "6", target: "11" },
        { id: "e7-12", source: "7", target: "12" },
        { id: "e8-13", source: "8", target: "13" },
        { id: "e9-13", source: "9", target: "13" },
        { id: "e10-12", source: "10", target: "12" },
        { id: "e11-14", source: "11", target: "14" },
        { id: "e12-15", source: "12", target: "15" },
        { id: "e13-16", source: "13", target: "16" },
      ],
      questions: [
        {
          question: "Why do investors care more about traction than ideas?",
          options: ["Ideas are easy; execution is hard. Traction proves execution.", "Investors don't understand ideas", "Traction means you spent money", "Ideas don't matter in business"],
          correctAnswer: 0,
          explanation: "As the saying goes: ideas are worthless, execution is everything. Traction (revenue, users, growth) is proof that the market validates your solution."
        },
        {
          question: "What is the single most important thing an investor looks for in a 3-minute pitch?",
          options: ["Fancy slides", "Clear evidence of product-market fit", "A fancy degree from a top university", "A catchy tagline"],
          correctAnswer: 1,
          explanation: "Product-market fit is the #1 factor investors evaluate. Do people actually want what you're building? Traction answers this question better than anything else."
        },
      ],
    },
  ];

  // Stub modules with expanded content
  const stubModules = [
    { slug: "occams-razor", title: "Occam's Razor", description: "The simplest solution is usually the correct one.", category: "logic", content: `Occam's Razor is a principle that suggests when presented with competing hypotheses, the one with the fewest assumptions should be selected.

### The Principle of Parsimony
The simplest explanation is usually the correct one. This doesn't mean the simplest answer is always right, but it should be your starting point.

### How to Apply
When choosing between competing explanations, prefer the one requiring the fewest leaps of logic. Use it as a thinking tool, not an absolute rule.` },
    { slug: "confirmation-bias", title: "Confirmation Bias", description: "The tendency to search for information that confirms your beliefs.", category: "psychology", content: `Confirmation bias is the tendency to search for, interpret, and recall information in a way that confirms your pre-existing beliefs.

### How It Distorts Thinking
You naturally favor evidence that supports your views while dismissing contradictory information. This creates an echo chamber in your mind.

### Breaking the Bias
Actively seek disconfirming evidence. Before making a decision, ask yourself: "What would prove me wrong?"` },
    { slug: "compound-effect", title: "The Compound Effect", description: "Small, smart choices + consistency + time = radical difference.", category: "success", content: `The Compound Effect is the principle of reaping huge rewards from small, consistent actions over time.

### The Math of Small Gains
Improving just 1% every day leads to a 37x improvement over a year. Small choices may seem insignificant in the moment but compound into massive results.

### Consistency Over Intensity
It's not about making huge changes—it's about making small good choices every single day. The magic happens in the mundane.` },
    { slug: "circle-influence", title: "Circle of Influence", description: "Focus on what you can control, not what you can't.", category: "stoicism", content: `Stephen Covey's Circle of Influence concept teaches us to focus our energy on things we can actually control.

### The Two Circles
The Circle of Concern includes everything you care about. The Circle of Influence is the subset you can actually affect. Wise people focus on the latter.

### Expanding Your Influence
By focusing entirely on what you can influence, you gradually expand that circle. Energy spent on concerns outside your control is wasted energy.` },
    { slug: "dunning-kruger", title: "Dunning-Kruger Effect", description: "People with low ability overestimate their skill level.", category: "cognitive-bias", content: `The Dunning-Kruger effect is a cognitive bias where people with low ability at a task overestimate their ability.

### The Confidence Gap
Novices lack the expertise to recognize their own incompetence, so they feel overly confident. Experts, knowing what they don't know, often underestimate themselves.

### Staying Grounded
Keep learning and stay humble. The more you know, the more you realize how much you don't know. True mastery comes with intellectual humility.` },
    { slug: "eisenhower-matrix", title: "Eisenhower Matrix", description: "Prioritize tasks by urgency and importance.", category: "productivity", content: `The Eisenhower Matrix helps you prioritize tasks by categorizing them into four quadrants.

### The Four Quadrants
Urgent & Important: Do immediately. Important & Not Urgent: Schedule. Urgent & Not Important: Delegate. Not Urgent & Not Important: Eliminate.

### Focus on Quadrant II
Most high-performers spend their time in Quadrant II (Important but Not Urgent). This is where planning, relationship building, and personal growth live.` },
    { slug: "growth-mindset", title: "Growth Mindset", description: "Believe your abilities can be developed through dedication.", category: "mindset", content: `A growth mindset is the belief that your basic qualities are things you can cultivate through effort.

### Fixed vs Growth
Fixed mindset believes talent is innate. Growth mindset sees challenges as opportunities. When you fail, a growth mindset says "I can't do it yet."

### Cultivating Growth
Praise effort, not outcomes. Embrace challenges as learning opportunities. Replace "I'm not good at this" with "What am I missing?"` },
    { slug: "imposter-syndrome", title: "Imposter Syndrome", description: "Feeling like a fraud despite evident success.", category: "psychology", content: `Imposter syndrome is a psychological pattern where one doubts their accomplishments and fears being exposed as a fraud.

### The Imposter Cycle
You achieve success, attribute it to luck, feel anxious about being "found out," work twice as hard, achieve more success—and the cycle repeats.

### Breaking Free
Document your wins objectively. Talk about it openly with peers. Remember that competence isn't about knowing everything—it's about figuring things out.` },
    { slug: "marginal-thinking", title: "Marginal Thinking", description: "Decisions based on incremental costs vs. total costs.", category: "decision-making", content: `Marginal thinking focuses on the additional cost or benefit of one more unit, rather than looking at total costs and benefits.

### Think at the Margin
Should you eat one more slice? It doesn't matter how full you are overall—it matters whether the marginal benefit of this slice exceeds the marginal cost.

### Better Decisions
Marginal thinking prevents sunken cost errors. The only question that matters is: "What happens if I take one more step in this direction?"` },
    { slug: "network-effect", title: "Network Effect", description: "Product becomes more valuable as more people use it.", category: "business", content: `The network effect occurs when a product or service becomes more valuable as more people use it.

### How Networks Grow
Each new user adds value for every existing user. This creates a positive feedback loop that makes dominant platforms extremely hard to displace.

### Building Network Effects
To leverage network effects, focus on user density in a specific market. A network is useless if no one you care about is on it.` },
    { slug: "opportunity-cost", title: "Opportunity Cost", description: "The loss of potential gain from other alternatives.", category: "decision-making", content: `Opportunity cost is the loss of potential gain from other alternatives when one alternative is chosen.

### Every Choice Has a Cost
When you say yes to something, you're implicitly saying no to everything else. Time spent scrolling is time not spent learning, building, or connecting.

### Making Conscious Trade-offs
Awareness of opportunity cost helps you make deliberate choices. Before committing, ask: "What am I giving up by choosing this?"` },
    { slug: "parkinsons-law", title: "Parkinson's Law", description: "Work expands to fill the time available for completion.", category: "productivity", content: `Parkinson's Law states that work expands so as to fill the time available for its completion.

### The Time Trap
Give yourself a week to write an email, and it'll take a week. Give yourself an hour, and it'll take an hour. The complexity of the task adjusts to the deadline.

### Use It to Your Advantage
Set artificial, tight deadlines for everything. Work will naturally compress to fit. This is why sprints and timeboxing are so effective for productivity.` },
    { slug: "rubber-ducky", title: "Rubber Duck Debugging", description: "Explain your problem to an inanimate object to solve it.", category: "problem-solving", content: `Rubber duck debugging is a method of debugging by explaining the problem to an inanimate object.

### Why It Works
Describing your problem step by step forces you to structure your thoughts clearly. In doing so, you often spot the flaw yourself.

### How to Do It
Get a rubber duck (or any object). Explain your problem out loud as if teaching it. Describe what you expect to happen versus what's actually happening. The answer usually emerges naturally.` },
    { slug: "sunk-cost", title: "Sunk Cost Fallacy", description: "Don't let past investments dictate future decisions.", category: "cognitive-bias", content: `The sunk cost fallacy is the tendency to continue an endeavor once an investment of time, money, or effort has been made.

### The Trap of "Already Invested"
"F, I've already spent so much on this degree/course/relationship." The rational question isn't "How much have I invested?" but "What is the best use of my resources from this point forward?"

### Escaping the Trap
Make decisions based on future value, not past costs. Ask yourself: "If I were starting fresh today, would I still choose this?"` },
    { slug: "systems-thinking", title: "Systems Thinking", description: "Understand how parts interrelate in a whole system.", category: "mental-model", content: `Systems thinking is a holistic approach to analysis that focuses on how parts interrelate within a whole.

### Beyond Linear Thinking
Problems rarely have single causes. Systems thinking reveals feedback loops, delays, and unintended consequences that linear thinking misses.

### Practical Application
Map out all the elements in a problem and draw arrows showing how they influence each other. Look for reinforcing loops (growth) and balancing loops (stability).` },
    { slug: "two-system", title: "Two Systems Theory", description: "Fast, intuitive vs. slow, deliberate thinking.", category: "psychology", content: `Two Systems Theory describes System 1 (fast, intuitive) and System 2 (slow, deliberate) thinking.

### System 1: The Autopilot
System 1 operates automatically and quickly—recognizing faces, reading emotions, making snap judgments. It's efficient but error-prone.

### System 2: The Pilot
System 2 allocates attention to effortful mental activities—complex calculations, logical reasoning. It's accurate but slow and lazy. Most errors happen when System 1 runs unchecked.` },
    { slug: "zero-sum", title: "Zero-Sum Game", description: "One person's gain is another's loss.", category: "game-theory", content: `A zero-sum game is where one participant's gain is exactly balanced by another's loss.

### Fixed Pie Thinking
Many situations look like zero-sum but aren't. Believing life is zero-sum leads to hyper-competition, scarcity mindset, and missed opportunities for collaboration.

### Creating Win-Win
In business and life, you can often expand the pie rather than fighting over slices. Look for opportunities where both sides can benefit.` },
    { slug: "antifragile", title: "Antifragile", description: "Systems that improve with disorder and stress.", category: "resilience", content: `Antifragile describes things that gain from disorder, volatility, and stress—going beyond resilience.

### Fragile vs Robust vs Antifragile
Fragile breaks under stress. Robust resists stress. Antifragile gets stronger. The immune system is antifragile—exposure to germs makes it stronger.

### Building Antifragility
Expose yourself to manageable doses of stress. Create systems that benefit from volatility. Have optionality—multiple paths to success so chaos works in your favor.` },
    { slug: "baader-meinhof", title: "Baader-Meinhof Phenomenon", description: "Learning something new makes you see it everywhere.", category: "psychology", content: `The Baader-Meinhof phenomenon is when you learn something new and then suddenly see it everywhere.

### Frequency Illusion
This combines two biases: selective attention (you notice what's on your mind) and confirmation bias (you look for evidence you're right). The thing didn't become more common—you just became more aware.

### Leveraging the Effect
Learn a new concept deeply, and you'll start seeing it everywhere. This is how mental models compound—each new model helps you recognize patterns you previously missed.` },
    { slug: "black-swan", title: "Black Swan Events", description: "Rare, unpredictable events with massive impact.", category: "risk", content: `A Black Swan event is an unpredictable event that has massive consequences and is often rationalized in hindsight.

### The Black Swan Triad
Rarity: It's an outlier. Extreme Impact: It changes everything. Retrospective Predictability: Everyone claims they "knew it all along" after the fact.

### Navigating Black Swans
Build robustness to negative Black Swans (don't risk what you can't afford to lose). Position yourself to benefit from positive Black Swans (say yes to optionality).` },
    { slug: "diminishing-returns", title: "Law of Diminishing Returns", description: "After a point, each additional unit yields less benefit.", category: "economics", content: `The law of diminishing returns states that adding more of one factor will at some point yield proportionally lower output.

### The Optimization Problem
The first hour of study is highly productive. The tenth hour? Much less so. This law applies everywhere—work, exercise, relationships, even happiness.

### Finding the Sweet Spot
Stop before the marginal benefit drops below the marginal cost. More isn't always better. The optimal point is where one more unit gives equal benefit and cost.` },
    { slug: "goodharts-law", title: "Goodhart's Law", description: "When a measure becomes a target, it ceases to be useful.", category: "economics", content: `Goodhart's Law states that when a measure becomes a target, it ceases to be a good measure.

### The Perverse Incentive
When you optimize a metric, people will game it. Test scores become less about learning and more about test-taking. Lines of code become a target, and suddenly you get bloated software.

### Choosing Metrics Wisely
Use multiple metrics. Change them periodically. Never make any single metric a target. Better yet, measure outcomes not outputs.` },
    { slug: "hanlons-razor", title: "Hanlon's Razor", description: "Never attribute to malice what can be explained by stupidity.", category: "logic", content: `Hanlon's Razor suggests we should not attribute to malice what can be adequately explained by ignorance, incompetence, or oversight.

### Why We Assume Malice
It's ego-protecting. If someone is against us, their opposition validates our importance. But most people aren't plotting against you—they're just busy with their own lives.

### Applying the Razor
Before getting angry at someone's actions, ask: "Could this be explained by them making a mistake, being tired, or not knowing better?" You'll save yourself a lot of unnecessary conflict.` },
    { slug: "survivorship-bias", title: "Survivorship Bias", description: "Focusing on successes while ignoring failures.", category: "cognitive-bias", content: `Survivorship bias is concentrating on survivors or successes while overlooking those that didn't make it.

### The Invisible Graveyard
We see successful startups and think "anyone can do it." We forget the thousands that failed. We see wealthy dropouts and think "school doesn't matter." We ignore the poor dropouts.

### Correcting for Bias
Ask: "What am I not seeing?" Look at the full dataset, not just the winners. Study failures as closely as successes. The graveyard of the invisible tells the real story.` },
    { slug: "mindfulness-basics", title: "Mindfulness Basics", description: "Training your brain to be present and focused.", category: "wellbeing", content: `Mindfulness is the practice of paying attention to the present moment without judgment.

### The Default Mode Network
Your brain has a "default mode" that runs on autopilot—worrying about the past, planning the future. Mindfulness trains you to notice when you've left the present and gently return.

### Starting Small
Sit for two minutes. Focus on your breath. When your mind wanders (and it will), gently bring it back. That's it. Do this daily and watch your focus and calm improve.` },
    { slug: "cognitive-restructuring", title: "Cognitive Restructuring", description: "Changing negative thought patterns to improve mental health.", category: "wellbeing", content: `Cognitive restructuring involves identifying and challenging irrational or negative thought patterns to improve mental health.

### Common Cognitive Distortions
All-or-nothing thinking, catastrophizing, mind reading, emotional reasoning—these patterns feel true but are rarely accurate reflections of reality.

### The ABCDE Method
Activating event → Belief → Consequence → Dispute → Effect. Catch the automatic thought, question its validity, and replace it with a balanced perspective.` },
    { slug: "deliberate-practice", title: "Deliberate Practice", description: "The science of becoming an expert at anything.", category: "focus", content: `Deliberate practice is structured skill improvement with focused, repetitive practice and immediate feedback.

### Beyond Naive Practice
Naive practice is just doing the thing. Deliberate practice is purposeful—identifying specific weaknesses, pushing beyond your comfort zone, and getting instant feedback.

### The 4 Components
1. Specific goal. 2. Full attention. 3. Immediate feedback. 4. Stretch just beyond current ability. Without these four, you're just going through the motions.` },
    { slug: "monk-mode", title: "Monk Mode", description: "Radical focus by eliminating all distractions for a set period.", category: "focus", content: `Monk mode is an extreme productivity strategy where you eliminate all non-essential activities for a set period to achieve radical focus.

### What You Cut
Social media, news, dating, events, entertainment, multitasking. You strip life down to: meaningful work, exercise, sleep, and basic maintenance.

### How Long?
Try 30 days. During monk mode, you'll be bored—which is the point. Boredom forces you to face your work and your thoughts without escape. Deep work becomes inevitable.` },
    { slug: "divergent-thinking", title: "Divergent Thinking", description: "Generating creative ideas by exploring many possible solutions.", category: "creativity", content: `Divergent thinking explores many possible solutions to generate creative ideas. Convergent thinking narrows them down.

### Quantity Breeds Quality
The best ideas usually emerge after you've exhausted the obvious ones. Generate first, judge later. Shoot for dozens of ideas before evaluating any of them.

### Techniques to Try
Brainstorming, mind mapping, free writing, SCAMPER (Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse). Each forces your brain down new paths.` },
    { slug: "lateral-thinking", title: "Lateral Thinking", description: "Solving problems through an indirect and creative approach.", category: "creativity", content: `Lateral thinking solves problems using an indirect and creative approach rather than traditional step-by-step logic.

### Breaking Patterns
Lateral thinking challenges assumptions. Instead of asking "How do I make my product better?" ask "How could I make it obsolete?" The reframe often reveals unexpected solutions.

### Provocative Operation
Use "po" statements to jolt your thinking. "Po: cars should have square wheels." This absurd idea forces you to think about what wheels really do and might lead to novel solutions.` },
    { slug: "learning-how-to-learn", title: "Learning How to Learn", description: "Meta-learning strategies to accelerate your skill acquisition.", category: "learning", content: `Learning how to learn is the ultimate meta-skill. It's the art of understanding how your brain acquires and retains knowledge.

### The Two Learning Modes
Focused mode: intense concentration on a specific problem. Diffuse mode: relaxed, allowing the brain to make connections across ideas. You need both.

### Key Strategies
Spaced repetition, active recall, interleaving, and the Feynman Technique (teach it to a child). These are scientifically proven to dramatically improve retention and understanding.` },
    { slug: "spaced-repetition", title: "Spaced Repetition", description: "Optimizing memory retention through strategic review intervals.", category: "learning", content: `Spaced repetition involves reviewing information at increasing intervals over time to optimize memory retention.

### The Forgetting Curve
Ebbinghaus discovered that we forget exponentially. Within hours, we lose 50% of what we learned. Spaced repetition interrupts this curve at strategic points.

### Practical Implementation
Review new material after 1 day, then 3, then 7, then 14, then 30 days. Use tools like Anki or a simple spreadsheet. The key is to review just before you would have forgotten.` },
    { slug: "decision-matrix", title: "Decision Matrix", description: "A framework for making rational choices under uncertainty.", category: "clarity", content: `A decision matrix helps you evaluate options by scoring them against weighted criteria.

### How to Build One
List your options as rows. List your criteria as columns. Weight each criterion by importance. Score each option per criterion. Multiply score by weight and sum.

### Reducing Bias
The matrix forces explicit trade-offs. You can't just say "I feel like Option A is better." You have to justify each score. This exposes hidden assumptions and emotional reasoning.` },
    { slug: "inversion-thinking", title: "Inversion Thinking", description: "Solving problems backward by considering the opposite.", category: "clarity", content: `Inversion involves looking at a problem from the opposite direction to gain new insights.

### Ask the Negative
Instead of "How do I achieve success?" ask "What would guarantee failure?" Then avoid those things. Instead of "How do I build a great product?" ask "What would make a product terrible?"

### The Power of Inverse
Inversion reveals blind spots. The things that cause failure often aren't the opposite of success factors—they're completely different variables. By studying failure, you protect against it.` },
    { slug: "habit-stacking", title: "Habit Stacking", description: "Building new habits by linking them to existing routines.", category: "habit", content: `Habit stacking pairs a new habit with an existing one, using the existing routine as a trigger.

### The Formula
After [existing habit], I will [new habit]. After I pour my morning coffee, I will meditate for 60 seconds. After I brush my teeth, I will floss one tooth.

### Why It Works
The existing habit serves as a built-in reminder and the neural pathway is already established. You're not creating a new routine from scratch—you're piggybacking on an existing one.` },
    { slug: "identity-based-habits", title: "Identity-Based Habits", description: "Lasting behavior change by shifting your self-identity.", category: "habit", content: `Focus on who you want to become, not what you want to achieve. Identity-based habits create lasting change.

### The Three Layers
Outcomes: what you get. Processes: what you do. Identity: what you believe. Most people focus on outcomes. Lasting change starts with identity.

### Shifting Your Identity
Instead of "I'm trying to quit sugar," say "I'm not a sugar-eater." Instead of "I want to read more," say "I'm a reader." Each small action reinforces the new identity.` },
    { slug: "first-principles-problem", title: "First Principles Problem Solving", description: "Breaking down complex problems into basic elements.", category: "problem-solving", content: `First principles thinking breaks down problems into fundamental truths and rebuilds solutions from there.

### Socratic Questioning
Start with your assumption and question it relentlessly. "Is it really true? What evidence do I have? What if I removed this assumption?"

### Elon's Rocket Example
In the 2000s, rockets were "expensive." But first principles showed the raw materials were only 2% of the price. The rest was manufacturing inefficiency. SpaceX built rockets for a fraction of the cost.` },
    { slug: "blue-ocean", title: "Blue Ocean Strategy", description: "Creating uncontested market space instead of competing.", category: "strategy", content: `Blue Ocean Strategy creates new market space rather than competing in existing, crowded markets.

### Red vs Blue Oceans
Red oceans are known markets with fierce competition. Blue oceans are unknown markets where demand is created, not fought over.

### Creating Your Blue Ocean
Look across alternative industries, strategic groups, buyer groups, complementary offerings. Ask: "What can I eliminate, reduce, raise, and create that no one else is doing?"` },
    { slug: "stoic-morning", title: "Stoic Morning Routine", description: "Starting your day with ancient wisdom for modern resilience.", category: "stoicism", content: `A Stoic morning involves waking early and reflecting on what you can control before the world imposes its agenda on you.

### The Premeditatio Malorum
Spend a few minutes visualizing the worst that could happen today. Not to be pessimistic, but to prepare. If someone insults you, how will you respond? If a project fails, what then?

### Morning Reflection
Ask: "What do I have that I take for granted? What would I miss if it were gone?" This shifts your brain from wanting to appreciating, from lack to abundance.` },
    { slug: "memento-mori", title: "Memento Mori", description: "Remembering your mortality to live a more meaningful life.", category: "stoicism", content: `Memento Mori is the practice of reflecting on one's own mortality to live a more focused and meaningful life.

### Death as a Teacher
Knowing you will die isn't morbid—it's clarifying. It strips away trivial concerns. "Am I really spending my limited time arguing about this?" becomes a powerful filter.

### Daily Practice
Keep a small symbol—a candle, a skull, a wilting flower. When you see it, pause and ask: "If today were my last day, would I want to be doing what I'm about to do?"` },
    { slug: "winner-effect", title: "Winner Effect", description: "How winning changes your brain chemistry for future success.", category: "success", content: `The winner effect is a phenomenon where winning increases the likelihood of winning future competitions by changing brain chemistry.

### The Neuroscience
Winning increases testosterone and dopamine levels, which boost confidence, focus, and risk-taking ability. This creates a virtuous cycle: win → chemical boost → perform better → win again.

### Building Momentum
Start with small, achievable wins. Each small victory primes your brain for bigger ones. This is why streak-tracking works—each checked day builds momentum.` },
    { slug: "ikigai", title: "Ikigai", description: "Finding your reason for being, Japanese philosophy style.", category: "success", content: `Ikigai is the Japanese concept of "reason for being"—the intersection of what you love, what you're good at, what the world needs, and what you can be paid for.

### The Four Circles
Your passion (what you love). Your mission (what the world needs). Your vocation (what you can be paid for). Your profession (what you're good at). Ikigai is the center where all four overlap.

### Finding Your Ikigai
Don't expect to find it overnight. Ikigai is discovered through action, not contemplation. Try things, reflect, and adjust. The answer emerges through living.` },
    { slug: "triz", title: "TRIZ Method", description: "Systematic problem-solving based on patterns of invention.", category: "problem-solving", content: `TRIZ is a problem-solving methodology based on patterns of invention discovered by analyzing thousands of patents.

### The Core Insight
Most problems have been solved before—just in different contexts. TRIZ provides a systematic way to find existing solutions and apply them to your problem.

### The 40 Principles
TRIZ identified 40 inventive principles (segmentation, asymmetry, nesting, etc.). When stuck, go through the list and ask "Can I apply this principle to my problem?" The solution often jumps out.` },
    { slug: "priming-effect", title: "Priming Effect", description: "How subtle cues unconsciously influence your behavior.", category: "psychology", content: `The priming effect occurs when exposure to one stimulus influences your response to another stimulus without conscious awareness.

### How Priming Works
If you read words related to "old" (wrinkle, gray, bingo), you'll walk slower leaving the room. If your phone buzzes, you'll feel the phantom buzz minutes later. Your brain is constantly being primed.

### Designing Your Environment
Priming works both ways. Curate your environment to prime desired behaviors. A book on your desk primes reading. A guitar on a stand primes playing. Out of sight truly is out of mind.` },
    { slug: "halo-effect", title: "Halo Effect", description: "How one positive trait influences perception of everything else.", category: "psychology", content: `The halo effect is a cognitive bias where your overall impression of a person influences how you feel about their specific traits.

### The Attractive Halo
We assume attractive people are smarter, kinder, and more competent. We assume successful people's opinions are correct in unrelated domains. Steve Jobs was brilliant at tech, but did that make him an expert in medicine?

### Separating Signal from Noise
Evaluate each trait independently. Judge the idea on its merits, not the person presenting it. Ask: "Would I think this was a good idea if someone I disliked proposed it?"` },
    { slug: "prisoners-dilemma", title: "Prisoner's Dilemma", description: "Why cooperation is hard even when it benefits everyone.", category: "game-theory", content: `The prisoner's dilemma shows why rational individuals might not cooperate even when cooperation benefits everyone.

### The Setup
Two prisoners are interrogated separately. If both stay silent, both get 1 year. If one confesses and the other stays silent, the confessor goes free and the other gets 10 years. If both confess, both get 5 years. Rational self-interest leads both to confess, even though silence is better for both.

### Real World Applications
Price wars, arms races, climate change—all are iterated prisoner's dilemmas. The solution is repeated interaction, reputation, and enforcing consequences for defection.` },
    { slug: "post-traumatic-growth", title: "Post-Traumatic Growth", description: "How adversity can lead to profound personal development.", category: "resilience", content: `Post-traumatic growth refers to positive psychological change experienced as a result of struggling with highly challenging life circumstances.

### The Five Domains
1. Greater appreciation of life. 2. Deeper relationships. 3. Increased personal strength. 4. New possibilities in life. 5. Spiritual or existential development.

### The Growth Through Struggle
You don't grow because of the trauma, but because of how you respond to it. Growth comes from meaning-making—finding purpose in pain and rebuilding a stronger self.` },
    { slug: "risk-reward", title: "Risk-Reward Ratio", description: "Calculating whether a bet is worth taking.", category: "risk", content: `The risk-reward ratio measures the potential loss versus the potential gain of an investment or decision.

### Asymmetric Bets
The best decisions have asymmetric payoffs: limited downside, unlimited upside. Writing a book costs time but could change your entire career. Starting a business risks capital but could create generational wealth.

### Calculating Expected Value
Risk × Probability of loss vs. Reward × Probability of gain. Take bets with positive expected value, especially when you can afford to lose and have many opportunities.` },
    { slug: "network-effects-business", title: "Network Effects in Business", description: "How platforms become more valuable as more people use them.", category: "business", content: `Network effects occur when a product becomes more valuable as more people use it, creating powerful competitive advantages.

### Types of Network Effects
Direct: Facebook—more friends, more value. Two-sided: Uber—more drivers attract more riders. Data: Waze—more users provide better traffic data. Tech: Microsoft Office—more users means more file compatibility.

### Winning with Networks
Get dense in a small market first. Every new user should noticeably increase value for existing users. Speed matters—whoever reaches critical mass first often wins.` },
    { slug: "moats", title: "Economic Moats", description: "Sustainable competitive advantages that protect a business.", category: "business", content: `An economic moat refers to a business's ability to maintain competitive advantages over its rivals to protect its market share and profitability.

### The Five Moats
1. Brand strength (Apple, Coca-Cola). 2. Switching costs (Adobe Creative Cloud). 3. Network effects (Facebook, Uber). 4. Cost advantages (Walmart, Amazon). 5. Intangible assets (patents, licenses).

### Building Your Personal Moat
The same principles apply to your career. Build switching costs (deep relationships), network effects (your reputation), unique skills (your brand), and compounding knowledge.` },
    { slug: "decoupling", title: "Decoupling Decisions", description: "Separating the decision from the outcome to think clearly.", category: "decision-making", content: `Decoupling separates the quality of a decision from its outcome to prevent outcome bias.

### The Poker Analogy
A good poker player can make the right decision (fold a bad hand) and still lose if the opponent gets lucky. A bad decision (bluff with nothing) can win if the opponent folds. Outcome ≠ Decision Quality.

### How to Decouple
Evaluate decisions based on the information available at the time, not the outcome. Before you know the result, write down why you're choosing this. Later, review the reasoning, not the result.` },
    { slug: "ladder-inference", title: "Ladder of Inference", description: "How your brain jumps from data to conclusions automatically.", category: "mental-model", content: `The ladder of inference describes the mental steps we take from observing data to taking action, often unconsciously.

### The Rungs
1. Raw data (what happened). 2. Selected data (what I notice). 3. Added meaning (my interpretation). 4. Assumptions (what I infer). 5. Conclusions (what I believe). 6. Beliefs (what I adopt). 7. Actions (what I do).

### Climbing Down
To avoid flawed conclusions, share your reasoning with others. Ask: "What data am I selecting? What assumptions am I making?" Others will see the rungs you missed.` },
    { slug: "burdens-proof", title: "Burden of Proof", description: "Understanding who is responsible for proving a claim.", category: "logic", content: `The burden of proof is the obligation to provide sufficient evidence for a claim. The person making the claim bears this burden.

### Extraordinary Claims Require Extraordinary Evidence
"Gravity exists" requires minimal proof because it's well-established. "I was abducted by aliens" requires much stronger evidence. The more a claim contradicts established knowledge, the heavier the burden.

### Shifting the Burden
Watch for arguments that shift the burden: "You can't prove God doesn't exist, therefore He does." The one making the positive claim must provide evidence. Skepticism is the default position.` },
    { slug: "emotional-regulation", title: "Emotional Regulation", description: "Managing your emotions for better decision-making.", category: "wellbeing", content: `Emotional regulation is the ability to manage your emotional state, especially during high-stakes or stressful situations.

### The 90-Second Rule
Neuroscientist Jill Bolte Taylor discovered that the chemical lifespan of an emotion is 90 seconds. Any emotional response lasting longer than that is because you're choosing to re-stimulate it with your thoughts.

### Techniques
Name the emotion: "I notice I'm feeling angry." This activates the prefrontal cortex and calms the amygdala. Breathe deeply for 90 seconds. Let the wave pass before responding.` },
    { slug: "kaizen", title: "Kaizen", description: "Continuous improvement through small daily changes.", category: "success", content: `Kaizen is the Japanese philosophy of continuous improvement through small, incremental changes.

### The One-Minute Principle
Ask yourself: "What can I improve for one minute?" One minute of exercise. One minute of organizing. One minute of meditating. Small enough to avoid resistance, consistent enough to compound.

### Why Kaizen Works
Large changes trigger fear and resistance. Tiny improvements fly under your brain's radar. Over time, these small gains accumulate into transformations that feel almost effortless.` },
    { slug: "amor-fati", title: "Amor Fati", description: "Loving everything that happens, including adversity.", category: "stoicism", content: `Amor Fati is the Stoic concept of "love of fate"—embracing everything that happens as necessary for your growth.

### Not Just Acceptance
Stoics don't just tolerate hardship—they love it. Every obstacle is an opportunity. Every failure is a lesson. Every enemy is a teacher. Not "this is fine" but "this is exactly what I needed."

### Living Amor Fati
When something "bad" happens, pause and ask: "How is this making me stronger? What is this teaching me? How will I be better because of this?" Over time, this reframe becomes automatic.` },
    { slug: "five-whys", title: "Five Whys", description: "Getting to the root cause by asking why five times.", category: "problem-solving", content: `The Five Whys is a root cause analysis technique that involves asking "why" repeatedly until you reach the fundamental cause of a problem.

### The Process
Start with the problem. Ask why it happened. Get an answer. Ask why that answer is true. Repeat. Usually within five iterations, you reach the root cause rather than a symptom.

### Example
"The project was late." Why? "The team started late." Why? "Requirements weren't clear." Why? "No stakeholder alignment meeting." Why? "We didn't schedule one." Root cause: No process for cross-team alignment before projects.` },
    { slug: "active-recall", title: "Active Recall", description: "Testing yourself to dramatically improve retention.", category: "learning", content: `Active recall is retrieving information from memory rather than passively reviewing it. It's one of the most effective learning techniques known.

### The Testing Effect
Reading notes creates fluency (the feeling of knowing) but not retention. Closing the book and trying to remember forces your brain to strengthen the neural pathways. A single active recall session beats five passive reviews.

### How to Practice
Read a section. Close the book. Write down everything you remember. Check what you missed. Repeat. Use flashcards with questions, not statements. The effort of retrieval is what locks in learning.` },
    { slug: "implementation-intention", title: "Implementation Intention", description: "Using if-then plans to lock in new habits.", category: "habit", content: `Implementation intentions are if-then plans that automate decision-making and dramatically increase follow-through.

### The Formula
"If [situation], then I will [action]." If it's 7 AM, then I will go for a run. If I finish lunch, then I will write 200 words. The trigger is specific and the action is clear.

### Why They Work
Implementation intentions offload the decision-making process. You don't need to "decide" to run at 7 AM—you already decided when you wrote the plan. This bypasses procrastination and motivation dips.` },
    { slug: "chicken-game", title: "Chicken Game", description: "The high-stakes game of mutual escalation.", category: "game-theory", content: `The chicken game models conflict where two parties engage in risky escalation to force the other to back down first.

### The Dynamics
Two drivers race toward each other. The one who swerves first is "chicken." If neither swerves, both crash. Each player hopes the other values survival more than pride.

### Real-World Application
Nuclear brinkmanship, price wars, labor negotiations. The best strategy is often to make it impossible for you to swerve (credible commitment) while giving the other side a dignified way to yield.` },
    { slug: "hyperfocus", title: "Hyperfocus", description: "Harnessing attention for deep productivity.", category: "focus", content: `Hyperfocus is intense concentration where time disappears and productivity soars.

### The Hyperfocus Cycle
Select a single task. Eliminate all distractions. Set a timer. Work until the timer ends or you hit a natural break point. The key is one task—not switching, not checking, just doing.

### Managing Distraction
Distractions aren't just phone notifications. They're open browser tabs, thoughts about other projects, background noise. Before hyperfocusing, do a "brain dump" of everything on your mind to clear mental RAM.` },
    { slug: "brainwriting", title: "Brainwriting", description: "Generating ideas in silence before group discussion.", category: "creativity", content: `Brainwriting is generating ideas independently in silence before sharing with the group, avoiding the pitfalls of traditional brainstorming.

### The Process
Everyone writes 3 ideas in 5 minutes in silence. Pass your paper to the right. Read what you received and add 3 new ideas or build on existing ones. Repeat for 3 rounds. Then discuss.

### Why It's Better
Traditional brainstorming lets loud voices dominate. Brainwriting captures everyone's ideas without social pressure. The written format also prevents "idea killing" during the generative phase. Build first, judge later.` },
    { slug: "anchoring-bias", title: "Anchoring Bias", description: "How first impressions distort your judgment.", category: "cognitive-bias", content: `Anchoring bias is relying too heavily on the first piece of information you receive when making decisions.

### The Power of the First Number
If a car is priced at $50,000, a $45,000 offer feels reasonable—even if the car is worth $35,000. The initial price "anchors" your perception of value. Real estate agents, negotiators, and salespeople use this constantly.

### Breaking the Anchor
Before hearing any price or number, decide your own reference point. Do independent research. Consider the opposite extreme. "What if this were priced 50% lower—would I still want it?"` },
    { slug: "second-order-thinking", title: "Second-Order Thinking", description: "Thinking about the consequences of consequences.", category: "clarity", content: `Second-order thinking considers the downstream effects of decisions rather than just the immediate results.

### First vs Second Order
First order: Build a wall to keep people out. Second order: It also keeps people in. First order: Cut costs by laying off staff. Second order: Remaining staff gets overworked and leaves. First order: Take a painkiller. Second order: The underlying issue never heals.

### Practicing It
For any decision, ask: "And then what?" Repeat five times. Consider unintended consequences. The best decisions are ones where first-order and second-order effects are both positive.` },
    { slug: "flywheel-effect", title: "Flywheel Effect", description: "How small efforts compound into massive momentum.", category: "business", content: `The flywheel effect describes how small efforts, consistently applied, build momentum over time until growth becomes self-sustaining.

### The Flywheel Concept
A flywheel is a heavy wheel that takes enormous effort to start spinning. But with consistent pushes in the same direction, it builds momentum. Eventually, each push has a multiplying effect.

### Your Business Flywheel
Better product → More customers → More revenue → Better product. Identify your loop. Each turn of the flywheel should get slightly easier. Don't stop pushing—the moment you do, friction slows it down.` },
    { slug: "mental-simulation", title: "Mental Simulation", description: "Running scenarios in your head to prepare for reality.", category: "mental-model", content: `Mental simulation involves running through scenarios in your mind to anticipate outcomes and prepare responses.

### Pre-mortems and Pre-parades
Before a project, simulate it failing. What went wrong? What did you miss? Then simulate it succeeding wildly. What made the difference? Both perspectives reveal blind spots.

### Applications
Athletes visualize performances. CEOs simulate board meetings. Surgeons rehearse procedures mentally. The brain activates similar neural patterns during mental rehearsal as during actual execution. You're literally practicing in your mind.` },
    { slug: "straw-man", title: "Straw Man Fallacy", description: "Misrepresenting an argument to make it easier to attack.", category: "logic", content: `The straw man fallacy involves distorting an opponent's argument to make it weaker and easier to refute.

### How It Works
Person A: "We should invest more in education." Person B: "So you think money grows on trees and we should bankrupt the country for schools?" B has created a straw man—a distorted version of A's position that's easy to attack.

### Defending Against It
Restate your opponent's position before responding: "Let me make sure I understand you correctly. You're saying..." If they've misrepresented you, calmly point out: "That's not what I said. What I said was..."` },
    { slug: "gtd-method", title: "GTD Method", description: "Getting things done through systematic organization.", category: "productivity", content: `Getting Things Done (GTD) is based on the principle that your mind is for having ideas, not holding them.

### The Five Steps
1. Capture: Write everything down. 2. Clarify: Decide what's actionable. 3. Organize: Put tasks in appropriate lists. 4. Reflect: Review regularly. 5. Engage: Do the work.

### The Key Insight
Your brain is terrible at storage but great at processing. By moving all task management to an external system, you free mental RAM for actual thinking. If it's in your head, it's not organized. Write it down immediately.` },
    { slug: "tragedy-commons", title: "Tragedy of the Commons", description: "How shared resources get depleted when everyone acts in self-interest.", category: "game-theory", content: `The tragedy of the commons describes depletion of shared resources when individuals act in their own self-interest.

### The Classic Example
Villagers share a common pasture. Each villager adds one more cow, thinking "one more cow won't hurt." But everyone thinks this, and the pasture is destroyed. Individual rationality leads to collective ruin.

### Solutions
Privatization: assign ownership. Regulation: set rules for use. Social norms: build community accountability. The key is aligning individual incentives with the collective good.` },
    { slug: "grey-swan", title: "Grey Swan Events", description: "Predictable yet ignored high-impact events.", category: "risk", content: `A grey swan is a potentially significant event whose possibility can be predicted but is often ignored.

### Grey vs Black Swans
Black swans are unpredictable. Grey swans are foreseeable but ignored—like a pandemic, a housing bubble, or political upheaval. The warning signs were there, but no one acted.

### Staying Prepared
Pay attention to tail risks. Ask: "What's the worst plausible scenario? What would I do if it happened?" Build buffers: cash reserves, redundant systems, optionality. Being prepared for grey swans gives you an enormous advantage.` },
    { slug: "emotional-immunity", title: "Emotional Immunity", description: "Building psychological resilience against daily stressors.", category: "resilience", content: `Emotional immunity is building mental defenses against daily stressors so they don't derail your focus and well-being.

### The Stress Inoculation
Just like physical immunity, emotional immunity is built through controlled exposure to manageable doses of stress. Each challenge you overcome strengthens your ability to handle the next one.

### Daily Practices
Morning journaling to "drain the emotional cup." Gratitude practice to counter negativity bias. Setting emotional boundaries ("I won't check email after 8 PM"). Creating space between stimulus and response. This is where your power lives.` },
    { slug: "fixed-vs-growth", title: "Fixed vs Growth Mindset", description: "How your beliefs about intelligence shape your potential.", category: "mindset", content: `Carol Dweck's research shows how your beliefs about your abilities shape your potential more than the abilities themselves.

### The Two Mindsets
Fixed mindset: Intelligence is static, so effort is pointless (you're either good at it or you're not). Growth mindset: Intelligence can be developed, so effort is how you grow. This one belief creates vastly different behaviors.

### The Power of "Yet"
"I can't do this" becomes "I can't do this yet." The word "yet" creates space for growth. It transforms failure from a verdict into data. Every master was once a beginner who refused to stop trying.` },
    { slug: "signaling-theory", title: "Signaling Theory", description: "How costly signals convey hidden qualities and shape strategic interactions.", category: "game-theory", content: `Signaling theory explains how one party credibly conveys information about themselves to another party when there is asymmetric information.
 
### The Job Market Signal
Michael Spence's Nobel-winning model: Employers can't observe a candidate's true productivity. A degree is a costly signal—it requires time, money, and effort. High-productivity workers find signaling easier (or more worthwhile) than low-productivity ones, so the signal separates them.
 
### Costly vs Cheap Talk
A signal only works if it's costly to fake. Saying "I'm a hard worker" is cheap talk—anyone can say it. Working 80-hour weeks for a month is a costly signal. The cost is what makes the signal credible.
 
### Conspicuous Consumption
Thorstein Veblen observed that people buy luxury goods not just for utility, but to signal wealth and status. A Rolex tells people "I have enough money that I can waste $10,000 on a watch." The waste itself is the point.
 
### Honest Signaling in Nature
Peacock tails are a biological signal: the larger and brighter the tail, the more fit the peacock must be (since the tail is heavy and attracts predators). Only the fittest peacocks can afford such a handicap. This is the "handicap principle."
 
### Applying Signaling Theory
In negotiations, making the first aggressive move signals strength but risks escalation. In dating, investing time and attention signals genuine interest. In business, expensive advertising signals commitment to a market. Always ask: "What is this action signaling, and is the cost high enough to make it credible?"` },
  ];

  // Create categories first
  const allModData = [...modulesData, ...stubModules];
  const uniqueCatNames = [...new Set(allModData.map((m) => m.category))];
  const categoryMap = new Map<string, string>();

  const sortOrders: Record<string, number> = {
    mindset: 1, clarity: 2, habit: 3, focus: 4, productivity: 5,
    strategy: 6, creativity: 7, learning: 8, wellbeing: 9,
    logic: 10, psychology: 11, success: 12, stoicism: 13,
    "cognitive-bias": 14, "decision-making": 15, business: 16,
    "problem-solving": 17, "mental-model": 18, resilience: 19,
    "game-theory": 20, risk: 21, economics: 22,
  };

  for (const catName of uniqueCatNames) {
    const slug = slugify(catName);
    const sortOrder = sortOrders[catName] ?? 99;
    const cat = await prisma.category.upsert({
      where: { slug },
      update: { name: catName, sortOrder },
      create: { name: catName, slug, description: null, sortOrder },
    });
    categoryMap.set(catName, cat.id);
  }
  console.log(`Created ${uniqueCatNames.length} categories`);

  // Insert full modules
  for (const mod of modulesData) {
    const rawNodes = makeNodes(mod.slug, mod.nodes);
    const nodeSlugs = ensureUniqueSlugs(rawNodes.map((n) => ({ label: n.label })));
    const uniqueNodes = rawNodes.map((n, i) => ({
      ...n,
      description: n.description || nodeDescription(n.label),
      content: n.content || generateNodeContent(n.label, mod.title),
      slug: nodeSlugs[i].slug,
    }));
    const uniqueEdges = makeEdges(mod.slug, mod.edges);
    // Remove existing module with this slug (cascades to nodes, edges, questions)
    await prisma.module.deleteMany({ where: { slug: mod.slug } });
    const created = await prisma.module.create({
      data: {
        slug: mod.slug,
        title: mod.title,
        description: mod.description,
        categoryId: categoryMap.get(mod.category),
        isPremium: true,
        isDraft: false,
        nodes: {
          create: uniqueNodes.map((n) => ({
            id: n.id,
            positionX: n.positionX,
            positionY: n.positionY,
            label: n.label,
            slug: n.slug,
            description: n.description,
            content: JSON.stringify(n.content),
          })),
        },
        edges: {
          create: uniqueEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label || null,
          })),
        },
        questions: {
          create: mod.questions.map((q) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })),
        },
      },
    });
    console.log(`  Created module: ${created.slug} (${created.id})`);
  }

  // Insert stub modules
  for (const mod of stubModules) {
    const graph = generateScenario(mod.title);
    const uniqueNodes = makeNodes(mod.slug, graph.nodes);
    const uniqueEdges = makeEdges(mod.slug, graph.edges);
    const questions = generateQuestions(mod.title);
    // Remove existing module with this slug (cascades to nodes, edges, questions)
    await prisma.module.deleteMany({ where: { slug: mod.slug } });
    const created = await prisma.module.create({
      data: {
        slug: mod.slug,
        title: mod.title,
        description: mod.description,
        categoryId: categoryMap.get(mod.category),
        isPremium: true,
        isDraft: false,
        nodes: {
          create: uniqueNodes.map((n) => ({
            id: n.id,
            positionX: n.positionX,
            positionY: n.positionY,
            label: n.label,
            slug: n.slug,
            description: n.description,
            content: n.content ? JSON.stringify(n.content) : null,
          })),
        },
        edges: {
          create: uniqueEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label || null,
          })),
        },
        questions: {
          create: questions.map((q) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })),
        },
      },
    });
    console.log(`  Created module: ${created.slug}`);
  }

  const allModules = await prisma.module.findMany({ orderBy: { createdAt: "asc" } });
  const progressMods = allModules.slice(0, 8);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  for (let i = 0; i < progressMods.length; i++) {
    const mod = progressMods[i];
    const firstNode = await prisma.moduleNode.findFirst({
      where: { moduleId: mod.id },
    });
    if (!firstNode) continue;
    const listening = [25, 50, 75, 100, 10, 40, 60, 90][i];
    const reading = [30, 60, 100, 80, 20, 50, 70, 100][i];
    const completed = listening >= 100 || reading >= 100;
    const lastReadAt = i < 3 ? yesterday : i < 6 ? twoDaysAgo : new Date();

    await prisma.userProgress.create({
      data: {
        userId: demoUser.id,
        moduleId: mod.id,
        nodeId: firstNode.id,
        listeningProgress: listening,
        readingProgress: reading,
        scrollPosition: 0,
        currentCharIndex: 0,
        completed,
        audioRate: 1,
        lastReadAt,
      },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.user.update({
    where: { id: demoUser.id },
    data: { streakCount: 3, lastActiveDate: yesterday },
  });

  console.log(`Progress seeded for ${progressMods.length} modules`);
  console.log(`Total modules created: ${modulesData.length + stubModules.length}`);
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
