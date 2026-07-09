import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
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
  const adminPassword = await bcrypt.hash("mabduh", 12);
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

  function makeNodes(modSlug: string, nodes: any[]) {
    return nodes.map((n) => ({
      ...n,
      id: `${modSlug}-${n.id}`,
    }));
  }
  function makeEdges(modSlug: string, edges: any[]) {
    return edges.map((e) => ({
      ...e,
      id: `${modSlug}-${e.id}`,
      source: `${modSlug}-${e.source}`,
      target: `${modSlug}-${e.target}`,
    }));
  }

  function toSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  function ensureUniqueSlugs(items: { label: string }[]): { slug: string }[] {
    const seen = new Map<string, number>();
    return items.map((item) => {
      const base = toSlug(item.label);
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
    const intros = [
      `When you think about "${label}", the key is to understand how it fits into ${moduleTitle.toLowerCase()}. This concept helps you see the bigger picture more clearly.`,
      `"${label}" is a crucial piece of the puzzle in ${moduleTitle.toLowerCase()}. Let's break down what it actually means in practice.`,
      `The idea of "${label}" often gets misunderstood. In the context of ${moduleTitle.toLowerCase()}, it takes on a specific meaning that we need to explore.`,
      `To master ${moduleTitle.toLowerCase()}, you need to internalize "${label}". This is where the real transformation begins.`,
      `Most people skip over "${label}" when learning about ${moduleTitle.toLowerCase()}, but that's a mistake. This concept is where the depth lies.`,
      `Let's zoom in on "${label}". This concept acts as a lever that amplifies everything else in ${moduleTitle.toLowerCase()}.`,
    ];
    const bodies = [
      `Think about how this applies to your daily life. When have you encountered a situation where understanding "${label.toLowerCase()}" would have changed your approach? The gap between knowing and applying is where growth happens.`,
      `Here's the thing about "${label.toLowerCase()}": it's not just theoretical. Every time you face a decision in this area, you're either applying this concept or ignoring it. There's no neutral.`,
      `The most successful people in any field have an intuitive grasp of "${label.toLowerCase()}". They may not articulate it, but their actions reflect this understanding consistently.`,
      `A common mistake people make with "${label.toLowerCase()}" is treating it as a one-time thing. In reality, it's a practice you need to return to again and again as circumstances change.`,
      `If you only take one thing from this section, let it be this: "${label.toLowerCase()}" is not about knowing—it's about doing. The insight is useless until it changes your behavior.`,
    ];
    const outros = [
      `As you move through the rest of this module, keep "${label.toLowerCase()}" in mind. It connects to nearly everything that follows.`,
      `Take a moment to reflect: how would your approach change if you fully embraced "${label.toLowerCase()}" starting today?`,
      `This concept doesn't exist in isolation. Pay attention to how "${label.toLowerCase()}" shows up in the other nodes of this module.`,
      `The real test isn't whether you understand "${label.toLowerCase()}"—it's whether you'll remember to apply it when it matters most.`,
    ];
    const i = Math.abs(hash);
    return [
      intros[i % intros.length],
      bodies[(i + 3) % bodies.length],
      outros[(i + 7) % outros.length],
    ];
  }

  function generateGraph(title: string) {
    const fallback = [
      `The ${title} Framework`,
      "Core Principles",
      "Practical Application",
      "Common Challenges",
      "Results & Mastery",
    ];
    const labels = fallback;
    const hash = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const layouts = [
      [
        { id: "1", positionX: 250, positionY: 0, label: labels[0] },
        { id: "2", positionX: 100, positionY: 150, label: labels[1] },
        { id: "3", positionX: 400, positionY: 150, label: labels[2] },
        { id: "4", positionX: 100, positionY: 300, label: labels[3] },
        { id: "5", positionX: 400, positionY: 300, label: labels[4] || "Mastery" },
      ],
      [
        { id: "1", positionX: 300, positionY: 0, label: labels[0] },
        { id: "2", positionX: 100, positionY: 150, label: labels[1] },
        { id: "3", positionX: 500, positionY: 150, label: labels[2] },
        { id: "4", positionX: 100, positionY: 300, label: labels[3] },
        { id: "5", positionX: 500, positionY: 300, label: labels[4] || "Mastery" },
        { id: "6", positionX: 300, positionY: 450, label: "Continuous Growth" },
      ],
      [
        { id: "1", positionX: 250, positionY: 0, label: labels[0] },
        { id: "2", positionX: 250, positionY: 150, label: labels[1] },
        { id: "3", positionX: 100, positionY: 300, label: labels[2] },
        { id: "4", positionX: 400, positionY: 300, label: labels[3] },
        { id: "5", positionX: 250, positionY: 450, label: labels[4] || "Mastery" },
      ],
    ];
    const layoutNodes = layouts[hash % layouts.length];
    const layoutSlugs = ensureUniqueSlugs(layoutNodes.map((n: any) => ({ label: n.label })));
    const nodes = layoutNodes.map((n: any, i: number) => ({
      ...n,
      description: nodeDescription(n.label),
      content: generateNodeContent(n.label, title),
      slug: layoutSlugs[i].slug,
    }));

    const edgeSets = [
      [
        { id: "e1-2", source: "1", target: "2", label: "Foundation" },
        { id: "e1-3", source: "1", target: "3", label: "Action" },
        { id: "e2-4", source: "2", target: "4" },
        { id: "e3-5", source: "3", target: "5" },
      ],
      [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e1-3", source: "1", target: "3" },
        { id: "e2-4", source: "2", target: "4" },
        { id: "e3-5", source: "3", target: "5" },
        { id: "e4-6", source: "4", target: "6" },
        { id: "e5-6", source: "5", target: "6" },
      ],
      [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3" },
        { id: "e2-4", source: "2", target: "4" },
        { id: "e3-5", source: "3", target: "5" },
        { id: "e4-5", source: "4", target: "5" },
      ],
    ];
    const edges = edgeSets[hash % edgeSets.length];
    return { nodes, edges };
  }

  function generateQuestions(title: string) {
    const text = `${title} is a powerful concept in personal development. It helps you understand how to approach challenges and make better decisions in your daily life.`;
    const text2 = `Applying ${title} leads to better outcomes by giving you a framework to think through problems more effectively.`;

    return [
      {
        question: `What is the central idea behind "${title}"?`,
        options: [
          text.substring(0, 90),
          `The opposite approach that prioritizes speed over understanding`,
          `A rigid rule that applies to every situation without exception`,
          `An outdated theory replaced by modern research`,
        ],
        correctAnswer: 0,
        explanation: text.substring(0, 150),
      },
      {
        question: `How should you apply "${title}" in practice?`,
        options: [
          `Ignore it and rely on intuition`,
          text2.substring(0, 90),
          `Apply it blindly without adaptation`,
          `Only use it in academic settings`,
        ],
        correctAnswer: 1,
        explanation: text2.substring(0, 150),
      },
    ];
  }

  // Full modules data
  const modulesData = [
    {
      slug: "stop-waiting",
      title: "Stop waiting to feel ready",
      description: "Why motivation follows action, not the other way around.",
      category: "mindset",
      content: `The greatest myth of productivity is that you need to "feel like it" before you start. We often wait for a surge of motivation, a clear mind, or the "perfect moment" to begin a difficult task.

### The Motivation Trap
Most people believe the cycle of work looks like this:
**Motivation → Action → Result**

In reality, the cycle is reversed:
**Action → Result → Motivation**

### The Physics of Starting
Think of your brain like a car in winter. The engine is cold. If you wait for the car to get warm before you start driving, you'll be sitting in the driveway forever. You have to start driving to get the engine warm.

### How to apply this:
1. **The 5-Minute Rule**: Commit to working on the task for just 5 minutes. After 5 minutes, you are free to stop. Usually, the momentum of those 5 minutes is enough to keep you going.
2. **Lower the Bar**: If you can't start, your first step is too big. Break it down until it feels "stupidly small."
3. **Embrace the "Shitty First Draft"**: Give yourself permission to do a bad job. Perfectionism is just procrastination in a fancy suit.`,
      nodes: [
        { id: "1", positionX: 250, positionY: 0, label: "Decision: Start a difficult project" },
        { id: "2", positionX: 50, positionY: 150, label: "Wait for motivation" },
        { id: "3", positionX: 450, positionY: 150, label: "Take immediate action (5 min)" },
        { id: "4", positionX: 50, positionY: 300, label: "Stagnation & Guilt" },
        { id: "5", positionX: 450, positionY: 300, label: "Clarity & Momentum" },
        { id: "6", positionX: 450, positionY: 450, label: "SUCCESS: Project completion" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Fear-based" },
        { id: "e1-3", source: "1", target: "3", label: "Action-based" },
        { id: "e2-4", source: "2", target: "4" },
        { id: "e3-5", source: "3", target: "5" },
        { id: "e5-6", source: "5", target: "6" },
      ],
      questions: [
        {
          question: 'According to the module, what is the correct cycle of productivity?',
          options: ["Motivation → Action → Result", "Action → Result → Motivation", "Result → Action → Motivation", "Action → Motivation → Result"],
          correctAnswer: 1,
          explanation: 'The cycle is reversed: Action leads to Result, which then generates Motivation.'
        },
        {
          question: "What is the '5-Minute Rule' from this module?",
          options: ["Work for exactly 5 minutes and then take a 5-minute break", "Commit to just 5 minutes—afterward you can stop if you want", "Spend 5 minutes planning before you start working", "Work on weekends for at least 5 minutes"],
          correctAnswer: 1,
          explanation: "The 5-Minute Rule is about committing to just 5 minutes of work. Usually, the momentum from those 5 minutes is enough to keep you going."
        },
        {
          question: "If you can't start a task, what does the module suggest?",
          options: ["Wait until you feel more prepared", "Break the task down until it feels 'stupidly small'", "Ask someone else to do it for you", "Read more about the topic first"],
          correctAnswer: 1,
          explanation: "If you can't start, your first step is too big. Break it down until it feels 'stupidly small'."
        },
        {
          question: "What is the 'Shitty First Draft' concept?",
          options: ["Write a rough draft and then edit heavily", "Give yourself permission to do a bad job", "Only create content when you're inspired", "Always aim for perfection on the first try"],
          correctAnswer: 1,
          explanation: "Perfectionism is just procrastination in a fancy suit. Give yourself permission to do a bad job."
        },
        {
          question: "The module compares the brain to a car in winter. What's the point?",
          options: ["Driving in winter is dangerous", "You need to warm up the car before driving", "You have to start driving to get the engine warm", "Cars break down in cold weather"],
          correctAnswer: 2,
          explanation: "You have to start driving to generate heat. Same with action: you start to generate motivation."
        },
      ],
    },
    {
      slug: "cost-of-not-deciding",
      title: "The cost of not deciding",
      description: "Every delay is still a choice. Map out what inaction actually costs you.",
      category: "clarity",
      content: `We often view "waiting" as a neutral state. We think that by not making a choice, we are keeping our options open. This is a dangerous illusion.

### Indecision is a Decision
When you refuse to choose between Option A and Option B, you are actually choosing **Option C: Stagnation.**

### The Hidden Costs
1. **Mental Overhead**: Every undecided project takes up "RAM" in your brain.
2. **Opportunity Cost**: While you are waiting to decide, you are losing months of experience.
3. **Loss of Agency**: If you don't decide, the world will decide for you.

### How to break the loop:
- **Set a "Hard Deadline"**: Give yourself 24 hours to gather data, then flip a coin if you have to.
- **Fear Setting**: Write down the absolute worst thing that could happen if you make the "wrong" choice.`,
      nodes: [
        { id: "1", positionX: 400, positionY: 0, label: "CHALLENGE: Career Pivot?" },
        { id: "2", positionX: 100, positionY: 150, label: "ACTION: Stay in Current Role" },
        { id: "4", positionX: 50, positionY: 300, label: "6 MONTHS: Comfort but growing boredom" },
        { id: "6", positionX: 50, positionY: 450, label: "1 YEAR: Skill stagnation" },
        { id: "8", positionX: 50, positionY: 600, label: "2 YEARS: Deep regret & Golden Handcuffs" },
        { id: "3", positionX: 700, positionY: 150, label: "ACTION: Pivot Immediately" },
        { id: "5", positionX: 750, positionY: 300, label: "6 MONTHS: High stress, steep learning" },
        { id: "7", positionX: 750, positionY: 450, label: "1 YEAR: New network & base mastery" },
        { id: "9", positionX: 750, positionY: 600, label: "2 YEARS: Career acceleration & Fulfillment" },
        { id: "10", positionX: 400, positionY: 200, label: 'INDECISION: Wait for "Perfect" timing' },
        { id: "11", positionX: 400, positionY: 350, label: "6 MONTHS: Analysis Paralysis" },
        { id: "12", positionX: 400, positionY: 500, label: "1 YEAR: Lost $50k in potential growth" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Safety" },
        { id: "e1-3", source: "1", target: "3", label: "Growth" },
        { id: "e1-10", source: "1", target: "10", label: "Fear" },
        { id: "e2-4", source: "2", target: "4" },
        { id: "e4-6", source: "4", target: "6" },
        { id: "e6-8", source: "6", target: "8" },
        { id: "e3-5", source: "3", target: "5" },
        { id: "e5-7", source: "5", target: "7" },
        { id: "e7-9", source: "7", target: "9" },
        { id: "e10-11", source: "10", target: "11" },
        { id: "e11-12", source: "11", target: "12" },
      ],
      questions: [
        {
          question: "According to the module, what does 'indecision' actually mean?",
          options: ["You are keeping your options open", "You are choosing Option C: Stagnation", "You are being wise and careful", "You are avoiding risk"],
          correctAnswer: 1,
          explanation: "Indecision is actually a decision itself—you're choosing stagnation by refusing to choose."
        },
        {
          question: "What is one of the 'Hidden Costs' of not deciding?",
          options: ["You save money by waiting", "Mental overhead that drains your energy", "You gain more options over time", "You become more decisive naturally"],
          correctAnswer: 1,
          explanation: "Every undecided project takes up 'RAM' in your brain, creating low-level background anxiety."
        },
        {
          question: "What does 'Loss of Agency' mean in the context of indecision?",
          options: ["You lose your driver's license", "If you don't decide, the world decides for you", "You become an agent of change", "You lose the ability to work"],
          correctAnswer: 1,
          explanation: "If you don't decide, external circumstances will decide for you."
        },
        {
          question: "What is the 'Hard Deadline' technique mentioned?",
          options: ["Wait for the perfect moment", "Give yourself 24 hours to gather data, then decide", "Never set deadlines for decisions", "Only decide on weekdays"],
          correctAnswer: 1,
          explanation: "Set a hard deadline: give yourself 24 hours to gather data, then flip a coin if needed."
        },
      ],
    },
    {
      slug: "building-habits",
      title: "Building habits that stick",
      description: "The mechanics of cue, routine, reward — and why most habits fail.",
      category: "habit",
      content: `Most people fail at building habits because they rely on willpower. Willpower is a finite resource—it's like a muscle that gets tired. To build a habit that lasts, you need a **system**.

### The Habit Loop
Every habit is driven by a simple neurological loop:
1. **The Cue**: The trigger that tells your brain to go into automatic mode.
2. **The Routine**: The behavior itself.
3. **The Reward**: The positive reinforcement that tells your brain, "This is worth remembering."

### Habit Stacking
The most effective way to build a new habit is to "stack" it onto an existing one.
**Formula: After [Current Habit], I will [New Habit].**

### The Goldilocks Rule
Humans experience peak motivation when working on tasks that are "just right"—neither too easy nor too difficult.`,
      nodes: [
        { id: "1", positionX: 250, positionY: 0, label: "Trigger: Morning Coffee" },
        { id: "2", positionX: 250, positionY: 150, label: "Action: Read 5 pages" },
        { id: "3", positionX: 250, positionY: 300, label: "Reward: Check phone" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3" },
      ],
      questions: [
        {
          question: "Why do most people fail at building habits according to the module?",
          options: ["They don't have enough time", "They rely on willpower which is finite", "They set goals that are too small", "They lack motivation from others"],
          correctAnswer: 1,
          explanation: "Willpower is a finite resource—like a muscle that gets tired. You need a system."
        },
        {
          question: "What are the three components of the Habit Loop?",
          options: ["Goal, Action, Result", "Cue, Routine, Reward", "Start, Middle, End", "Trigger, Response, Consequence"],
          correctAnswer: 1,
          explanation: "Every habit is driven by: 1. The Cue (trigger), 2. The Routine (behavior), 3. The Reward."
        },
        {
          question: "What is 'Habit Stacking'?",
          options: ["Stacking books to read", "After [Current Habit], I will [New Habit]", "Doing multiple habits at once", "Piling up rewards for motivation"],
          correctAnswer: 1,
          explanation: "Habit Stacking means attaching a new habit to an existing one."
        },
      ],
    },
    {
      slug: "deep-work",
      title: "Deep Work Mastery",
      description: "How to focus without distraction in a noisy world.",
      category: "focus",
      content: `Deep Work is the ability to focus without distraction on a cognitively demanding task.

### The Shallow Work Trap
Most people spend their day in "shallow work"—emails, meetings, Slack messages.

### The 4 Rules of Deep Work
1. **Work Deeply**: Build rituals and routines that minimize friction.
2. **Embrace Boredom**: Your ability to concentrate is like a muscle.
3. **Quit Social Media**: These tools fragment your attention.
4. **Drain the Shallows**: Be ruthless about eliminating low-value activities.`,
      nodes: [
        { id: "1", positionX: 250, positionY: 0, label: "Shallow Work" },
        { id: "2", positionX: 100, positionY: 150, label: "Emails & Meetings" },
        { id: "3", positionX: 400, positionY: 150, label: "Deep Work" },
        { id: "4", positionX: 400, positionY: 300, label: "High Value Creation" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Easy" },
        { id: "e1-3", source: "1", target: "3", label: "Hard" },
        { id: "e3-4", source: "3", target: "4" },
      ],
      questions: [
        {
          question: "What is Deep Work?",
          options: ["Working long hours without sleep", "Focus without distraction on cognitively demanding tasks", "Doing multiple tasks at once", "Working in a noisy environment"],
          correctAnswer: 1,
          explanation: "Deep Work is the ability to focus without distraction on a cognitively demanding task."
        },
        {
          question: "What is the 'Shallow Work Trap'?",
          options: ["Working in shallow water", "Spending your day on emails, meetings, easy tasks", "Not working hard enough", "Working without a desk"],
          correctAnswer: 1,
          explanation: "Shallow work includes emails, meetings, Slack messages—activities that don't create much value."
        },
      ],
    },
    {
      slug: "pareto-principle",
      title: "The 80/20 Rule",
      description: "How to identify and amplify the vital few inputs that drive the majority of results.",
      category: "productivity",
      content: `The Pareto Principle states that for many outcomes, roughly 80% of consequences come from 20% of causes.

### The Power Law
In business: 80% of revenue comes from 20% of customers.
In productivity: 80% of results come from 20% of your efforts.

### How to Apply It
1. **Identify the Vital Few**: What 20% of your activities generate 80% of your results?
2. **Eliminate the Trivial Many**: Cut the 80% that only generate 20% of results.`,
      nodes: [
        { id: "1", positionX: 250, positionY: 0, label: "All Efforts (100%)" },
        { id: "2", positionX: 100, positionY: 150, label: "Vital Few (20%)" },
        { id: "3", positionX: 400, positionY: 150, label: "Trivial Many (80%)" },
        { id: "4", positionX: 100, positionY: 300, label: "80% of Results" },
        { id: "5", positionX: 400, positionY: 300, label: "20% of Results" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e1-3", source: "1", target: "3" },
        { id: "e2-4", source: "2", target: "4", label: "80% Results" },
        { id: "e3-5", source: "3", target: "5", label: "20% Results" },
      ],
      questions: [
        {
          question: "What is the Pareto Principle (80/20 Rule)?",
          options: ["Work 80% and rest 20%", "80% of results come from 20% of efforts", "Spend 80% of time on planning", "Do 20% of work for 80% pay"],
          correctAnswer: 1,
          explanation: "Roughly 80% of consequences come from 20% of causes."
        },
        {
          question: "How should you apply the 80/20 rule?",
          options: ["Work less and hope for the best", "Identify the vital few activities and double down", "Only do 20% of your work", "Ignore 80% of your customers"],
          correctAnswer: 1,
          explanation: "Identify the Vital Few: what 20% generates 80% of results? Double down on those."
        },
      ],
    },
    {
      slug: "first-principles",
      title: "First Principles Thinking",
      description: "Break complex problems into basic truths and rebuild from scratch.",
      category: "strategy",
      content: `First Principles Thinking is a problem-solving approach that breaks complex problems down into basic, foundational truths (first principles) and then rebuilds from there.

### The Analogy: The Chef vs The Cook
- **The Cook**: Follows recipes. Uses what others have done.
- **The Chef**: Understands ingredients. Knows why things work.

### How to Use First Principles
1. **Identify the Problem**: What are you trying to solve?
2. **Break It Down**: What are the foundational truths?
3. **Rebuild**: How can you combine these truths in new ways?`,
      nodes: [
        { id: "1", positionX: 250, positionY: 0, label: "Complex Problem" },
        { id: "2", positionX: 100, positionY: 150, label: "Break Down" },
        { id: "3", positionX: 400, positionY: 150, label: "First Principles" },
        { id: "4", positionX: 250, positionY: 300, label: "Rebuild Solution" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3" },
        { id: "e3-4", source: "3", target: "4" },
      ],
      questions: [
        {
          question: "What is First Principles Thinking?",
          options: ["Following recipes and best practices", "Breaking problems into basic truths and rebuilding", "Using analogies to solve problems", "Thinking about principles first thing in the morning"],
          correctAnswer: 1,
          explanation: "First Principles breaks complex problems into basic truths and rebuilds from scratch."
        },
        {
          question: "What's the difference between The Chef and The Cook?",
          options: ["Chefs cook better food", "Chefs follow recipes, Cooks create new ones", "Cooks follow recipes, Chefs understand ingredients", "There is no difference"],
          correctAnswer: 2,
          explanation: "The Cook follows recipes. The Chef understands ingredients and creates new recipes."
        },
      ],
    },
    {
      slug: "creative-flow",
      title: "Unlocking Creative Flow",
      description: "Enter the zone where your best work happens automatically.",
      category: "creativity",
      content: `Flow is a state of complete immersion in an activity. You lose track of time. Performance peaks.

### The 3 Conditions for Flow
1. **Clear Goals**: You know exactly what you're trying to achieve.
2. **Immediate Feedback**: You know instantly if you're on track.
3. **Challenge-Skill Balance**: The task is neither too easy nor too hard.

### The Flow Cycle
1. **Struggle**: Initial resistance.
2. **Release**: Let go of forcing it.
3. **Flow**: Suddenly, you're in the zone.
4. **Consolidation**: Integrate what you learned.`,
      nodes: [
        { id: "1", positionX: 250, positionY: 0, label: "Struggle Phase" },
        { id: "2", positionX: 100, positionY: 150, label: "Release" },
        { id: "3", positionX: 400, positionY: 150, label: "Flow State" },
        { id: "4", positionX: 250, positionY: 300, label: "Peak Performance" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3" },
        { id: "e3-4", source: "3", target: "4" },
      ],
      questions: [
        {
          question: "What are the 3 conditions for Flow?",
          options: ["Money, Time, Resources", "Clear Goals, Immediate Feedback, Challenge-Skill Balance", "Music, Coffee, Silence", "Hard Work, Luck, Talent"],
          correctAnswer: 1,
          explanation: "Flow requires Clear Goals, Immediate Feedback, and Challenge-Skill Balance."
        },
        {
          question: "What is the Flow Cycle?",
          options: ["Wake up, Work, Sleep", "Struggle → Release → Flow → Consolidation", "Plan, Execute, Review", "Start, Stop, Restart"],
          correctAnswer: 1,
          explanation: "The Flow Cycle: Struggle, Release, Flow, Consolidation."
        },
      ],
    },
    {
      slug: "mental-models",
      title: "Mental Models 101",
      description: "Build a latticework of mental models to make better decisions.",
      category: "learning",
      content: `A mental model is a framework or lens through which you view the world.

### The Best Mental Models
1. **Occam's Razor**: The simplest explanation is usually correct.
2. **Inversion**: Solve problems backward.
3. **Circle of Competence**: Know what you know and what you don't.
4. **Margin of Safety**: Always leave room for error.
5. **Compound Interest**: Small gains, consistently applied, lead to exponential growth.`,
      nodes: [
        { id: "1", positionX: 250, positionY: 0, label: "Problem" },
        { id: "2", positionX: 100, positionY: 150, label: "Single Model" },
        { id: "3", positionX: 400, positionY: 150, label: "Latticework of Models" },
        { id: "4", positionX: 400, positionY: 300, label: "Better Decisions" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Limited" },
        { id: "e1-3", source: "1", target: "3", label: "Diverse" },
        { id: "e3-4", source: "3", target: "4" },
      ],
      questions: [
        {
          question: "What is a Mental Model?",
          options: ["A physical model of the brain", "A framework or lens to simplify complexity", "A type of 3D modeling software", "A model for acting mentally ill"],
          correctAnswer: 1,
          explanation: "A mental model is a framework or lens through which you view the world."
        },
        {
          question: "What is 'Inversion' as a mental model?",
          options: ["Turning things upside down", "Solving problems backward: 'How do I fail?' then avoid", "Reversing your decisions", "Doing the opposite of what everyone says"],
          correctAnswer: 1,
          explanation: "Inversion means solving problems backward."
        },
      ],
    },
    {
      slug: "stress-management",
      title: "The Stress Reset",
      description: "Science-based techniques to manage stress and protect your mental bandwidth.",
      category: "wellbeing",
      content: `Stress isn't the enemy—chronic stress is.

### The Physiology of Stress
When you're stressed, your body releases cortisol and adrenaline.

### Stress Management Techniques
1. **Box Breathing**: Inhale 4 seconds, hold 4, exhale 4, hold 4.
2. **The 5-4-3-2-1 Grounding Technique**: Acknowledge 5 things you see, 4 you can touch, etc.
3. **Cognitive Reframing**: Instead of "I'm stressed," say "I'm excited."
4. **Nature Therapy**: 20 minutes in nature reduces cortisol levels.`,
      nodes: [
        { id: "1", positionX: 250, positionY: 0, label: "Stress Trigger" },
        { id: "2", positionX: 100, positionY: 150, label: "Chronic Stress" },
        { id: "3", positionX: 400, positionY: 150, label: "Managed Stress" },
        { id: "4", positionX: 100, positionY: 300, label: "Health Damage" },
        { id: "5", positionX: 400, positionY: 300, label: "Peak Performance" },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", label: "Ignore" },
        { id: "e1-3", source: "1", target: "3", label: "Manage" },
        { id: "e2-4", source: "2", target: "4" },
        { id: "e3-5", source: "3", target: "5" },
      ],
      questions: [
        {
          question: "What is the difference between acute and chronic stress?",
          options: ["Acute is bad, chronic is good", "Acute is short-term (useful), chronic is long-term (damaging)", "They are the same thing", "Acute is physical, chronic is mental"],
          correctAnswer: 1,
          explanation: "Acute stress can improve performance. Chronic stress damages your brain and body."
        },
        {
          question: "What is Box Breathing?",
          options: ["Breathing in a square room", "Inhale 4s, hold 4s, exhale 4s, hold 4s", "Breathing into a box", "A breathing technique for boxers"],
          correctAnswer: 1,
          explanation: "Box Breathing activates the parasympathetic nervous system."
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
        category: mod.category,
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
    const graph = generateGraph(mod.title);
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
        category: mod.category,
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
