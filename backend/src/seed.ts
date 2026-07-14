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

  function generateNarrativeIntro(title: string, category: string): string {
    const metaMap: Record<string, number> = {
      mindset: 0, habit: 0, resilience: 0, learning: 0, focus: 0, productivity: 0, wellbeing: 0,
      logic: 1, clarity: 1, decision: 1, problem: 1, mental: 1,
      psychology: 2, cognitive: 2, stoicism: 2,
      strategy: 3, business: 3, game: 3, risk: 3, success: 3, economics: 3,
      creativity: 4,
    };
    const metaKey = Object.keys(metaMap).find((k) => category.includes(k)) || '';
    const metaIdx = metaMap[metaKey] ?? 0;
    const hookPool = [
      // 0: Self-mastery (mindset, habit, resilience, learning, focus, productivity, wellbeing)
      [
        `You've been telling yourself "I'll start tomorrow" for six months. The gym membership collects dust. The online course sits unfinished at 13%. You're not lazy — you're waiting for a motivation that never comes. And deep down, you know tomorrow never arrives. ${title} isn't about willpower. It's about a system that works when motivation doesn't.`,
        `You failed again. Same mistake. Same pattern. Same feeling of "how did I end up here?" The shame is familiar. But beneath it, a different voice speaks — one that's been shaped by ${title}. It says failure isn't the opposite of growth. It's the raw material. The question isn't whether you'll fall. It's whether you'll use the fall to learn.`,
        `Everyone tells you that you have potential. But potential feels like a curse. It means you could be good but aren't yet. You've been "almost there" for years. The gap between where you are and where you want to be feels impossible to cross. ${title} reveals that the gap isn't a canyon — it's a thousand single steps you've been refusing to take.`,
        `You're exhausted from trying to be someone you're not. At work you're professional. With friends you're funny. With family you're the reliable one. But when you're alone, you don't know who you are anymore. The mask is heavy. ${title} isn't about becoming someone new. It's about shedding the layers that aren't you.`,
        `You set a goal. Made a plan. Felt excited. And then — nothing. The plan sits in a drawer, untouched. You don't understand why you can't follow through. You have the time, the skill, the resources. But something inside you resists. ${title} shows you that resistance isn't weakness. It's information. Something about the goal doesn't align with who you believe you are.`,
        `The habit you wanted to build lasted exactly four days. Day one was great. Day two was harder. Day three you forgot. Day four you told yourself you'd restart on Monday. It's been three months of Mondays. ${title} reveals that you don't need more discipline. You need to change the story you tell yourself about who you are.`,
        `You watch someone who started after you pass you by. They're not smarter or more talented. They just showed up every day. While you waited for perfect conditions, they worked with imperfect ones. The gap isn't ability — it's consistency. ${title} reminds you that time, not talent, is the great equalizer.`,
        `You're comfortable. Not happy — comfortable. The days blur together. You get up, work, eat, scroll, sleep, repeat. You're not suffering. But you're not growing either. And somewhere deep down, you know that comfort is a slow kind of dying. ${title} arrives as an invitation to be uncomfortable again.`,
      ],
      // 1: Thinking (logic, clarity, decision-making, problem-solving, mental-model)
      [
        `You're drowning in options. Career paths, investments, relationships — every direction seems equally valid. You've made lists, asked for advice, slept on it. And you're more confused than ever. The problem isn't a lack of information. You have too much of it. ${title} is the filter you've been missing — the one thing that separates signal from noise.`,
        `You made a decision you were sure was right. The logic was flawless. Everyone agreed. And yet — it failed. Spectacularly. Now you're questioning everything. What did you miss? ${title} reveals the blind spot that your confidence created. Being certain is not the same as being correct.`,
        `Someone presents an argument that seems undeniable. They have data, charts, and charisma. But something feels wrong — a small voice you can't quite articulate. You stay quiet because they seem so sure. ${title} gives you the tool to distinguish between confidence and truth.`,
        `You've been solving the same problem for weeks. Every approach leads to a dead end. Your team is frustrated. You're starting to believe it's unsolvable. But what if the problem isn't the problem? What if the way you're framing it is? ${title} shows you how to reframe instead of push harder.`,
        `You thought you understood something completely. You could teach it, defend it, apply it. Then someone asked a simple question that exposed a gap you didn't know existed. The embarrassment is sharp. But ${title} reveals that the gap isn't a weakness — it's the most valuable thing you have. Now you know where to grow.`,
        `A meeting where everyone agrees too quickly. A decision that feels rushed. You want to speak up, but you don't want to be the one who slows things down. You stay quiet. Later, the decision proves disastrous. ${title} teaches you that the courage to say "wait" is worth more than the comfort of going along.`,
        `The data says one thing. Your gut says another. You've been trained to trust hard evidence. But your intuition won't stop buzzing. Which do you follow? ${title} reveals this is a false dilemma. The real skill isn't choosing intuition or data — it's knowing when each one deserves your trust.`,
        `You think you know why something happened. The story is clean. Cause and effect are obvious. But you've been wrong before — many times. The narratives we construct about why things happen are often elegant fictions. ${title} helps you see the difference between a satisfying story and the messy truth.`,
      ],
      // 2: People (psychology, cognitive-bias, stoicism)
      [
        `Your partner says "I'm fine" but clearly isn't. You've learned that pressing the issue makes it worse. You feel stuck between ignoring it and making things worse. ${title} offers a third path — not fixing, not ignoring, but truly seeing. The skill of being present with someone's pain without needing to solve it.`,
        `You sent a message that was completely misinterpreted. You meant one thing; they heard something else. Now there's tension where there was none before. You're frustrated because your intention was good. But ${title} reminds you that intent doesn't matter when impact says otherwise. The gap between what you say and what they hear is where relationships break.`,
        `A colleague took credit for your work. You're furious. Every cell in your body wants to confront them, to set the record straight. But you've learned that direct confrontation often backfires. ${title} offers a way to protect your boundaries without igniting a war.`,
        `You desperately need someone to say yes. You've prepared your pitch, your logic, your evidence. Yet they're hesitating. You can feel the no coming. Pushing harder will damage the relationship. ${title} shows you that influence isn't about convincing. It's about understanding what they truly want and showing them how you both can win.`,
        `You're in an argument that's escalating. Each word makes it worse. You can feel the relationship fraying. You want to stop, but your pride won't let you. You're trapped by the need to be right. ${title} gives you the one thing you need most: the ability to pause before the damage becomes permanent.`,
        `Someone did something that makes no sense to you. It seems irrational, even self-destructive. Your first instinct is judgment — "what were they thinking?" But ${title} reminds you that every action makes perfect sense from the inside. The question isn't "what's wrong with them?" It's "what are they seeing that I'm missing?"`,
        `You need to give difficult feedback and you've been postponing it for weeks. Every day it gets heavier. You're afraid of their reaction, of damaging the relationship, of being seen as harsh. ${title} transforms feedback from a threat into a gift — delivered with honesty and received with growth.`,
        `Someone criticizes you and your body reacts before your mind does. Heart pounds. Face flushes. Words spill out — defensive, sharp, regrettable. Later, you replay the scene wishing you'd been different. ${title} helps you catch the reaction before it catches you, creating a space between stimulus and response.`,
      ],
      // 3: Strategy (strategy, business, game-theory, risk, success, economics)
      [
        `Your team is busy but going nowhere. Meetings fill the calendar. Everyone is exhausted. But the numbers aren't moving. You suspect you're mistaking activity for progress, but you don't know how to shift direction without demoralizing everyone. ${title} draws the line between motion and momentum — and shows you which one you've been chasing.`,
        `You have a vision that excites you. But the gap between vision and reality is terrifying. You don't know where to start. The scale of what you want to build paralyzes you. ${title} breaks the impossible into the inevitable — one piece at a time.`,
        `A crisis hits and everyone looks to you. Your mind is racing, but your face must stay calm. You have seconds to choose between two paths, and either could be catastrophic. Panic is not an option. ${title} gives you a framework that works when your instincts are screaming.`,
        `Your best employee just quit. They didn't give a reason you understand. You paid fairly, offered freedom, respected their work. What did you miss? ${title} reveals a hard truth: people don't leave jobs. They leave leaders who stopped paying attention.`,
        `You're leading a change that everyone resists. You know it's necessary. You've explained the reasons. But they're not buying it. The harder you push, the more they dig in. ${title} shows you that resistance isn't your enemy — it's a signal that you skipped a step.`,
        `The system you built is breaking. What worked last year doesn't work now. You're spending all your energy fighting fires instead of building for the future. You're exhausted. ${title} teaches you that every system is perfectly designed to produce the results it's getting. To change the results, you must change the system.`,
        `You have limited resources and unlimited demands. Every department needs funding. Every argument is compelling. You can't say yes to everyone. But saying no means something will fail. ${title} helps you find the one investment that multiplies everything else.`,
        `You're accountable for results you can't fully control. The market shifts. Competitors emerge. Customers change their minds. You feel like you're steering a ship in a hurricane. ${title} brings you back to the one thing you can always control: your next move.`,
      ],
      // 4: Creation (creativity)
      [
        `You've been staring at a blank page for three hours. The cursor blinks, mocking you. You've tried freewriting, changing locations, looking at inspiration. Nothing works. The harder you try to force creativity, the more it eludes you. ${title} reveals that creativity isn't a switch to flip — it's a well that needs priming.`,
        `You have an exciting new idea. But the more you examine it, the more flaws you find. By the time you're done analyzing, the excitement is gone. You've killed another spark before it had a chance to burn. ${title} helps you protect the fragile early stage of creation from the killer instinct of judgment.`,
        `You look at what others create and feel small. Their work looks effortless, brilliant, original. Yours feels clumsy, derivative, amateurish. The gap is demoralizing. But ${title} reminds you that every master was once a beginner who kept going while everyone else quit.`,
        `You're stuck in a formula that works. You've found something that gets approval, so you keep repeating it. But you're bored. Your work has lost its aliveness. You want to break out, but you're scared. ${title} pushes you past the edge of your comfort zone into territory where the work feels alive again.`,
        `Someone dismisses your work with a throwaway comment. It wasn't even cruel — just indifferent. But it lands like a knife. You want to defend, explain, justify. But the damage is done. ${title} teaches you to separate feedback about your work from judgment about your worth.`,
        `You have too many ideas. Your notebook is full of half-started projects. Friends call you "the ideas person." But ideas without execution are just expensive thoughts. ${title} helps you choose — what to start, what to finish, and what to finally let go.`,
        `Inspiration struck at 2 AM. Pure magic. You saw the whole vision in a flash. You fell asleep planning. But morning came and the magic was gone. The idea that felt brilliant at midnight looks ordinary in daylight. ${title} gives you the tools to capture the spark before it fades.`,
        `You're collaborating with a creative partner whose style clashes with yours. You want structure. They want chaos. The tension is killing the project. But ${title} reveals that friction between different creative styles isn't a problem — it's the source of the most original work.`,
      ],
    ];
    const h = (title + category).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const h2 = title.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
    const pool = hookPool[metaIdx];
    const closings = [
      `That's the thing about real learning — it doesn't arrive when you're ready. It arrives when you're finally quiet enough to hear it.`,
      `Growth doesn't announce itself. You just look back one day and realize you're not the same person who started.`,
      `The lesson wasn't in the answer. It was in the willingness to sit with the question long enough for the answer to find you.`,
      `You can't unlearn something that's become part of how you see. Once you've seen it, the world is different. And you wouldn't go back even if you could.`,
      `This is how change actually happens — not in grand resolutions, but in small shifts that accumulate until the landscape is unrecognizable.`,
      `You carry the lesson with you now. Not as a rule, but as a reflex. The next time life tests you, you'll be ready in a way you weren't before.`,
      `And that's the paradox: the more you learn, the more you realize how much you don't know. The circle of knowledge is bordered by an ocean of mystery.`,
      `You didn't find the answer you were looking for. You found something better — a better question. And a good question is worth more than a hundred answers.`,
      `The person you were this morning didn't know what you know now. That person did their best. And their best was enough to get you here.`,
      `Some lessons arrive as storms. Others as whispers. The ones that stay are the ones that surprised you when you weren't looking for them.`,
      `The moment passes. The insight stays. That's the transaction — you trade a moment of discomfort for a lifetime of deeper understanding.`,
      `You can't force growth. You can only create the conditions for it — and then let it happen in its own time. Patience is the forgotten ingredient.`,
      `The test wasn't whether you got it right. It was whether you stayed in the game long enough for it to change you.`,
      `You see now what you couldn't see before. Not because the world changed — because you did. And that's the only shift that matters.`,
      `Understanding isn't a destination. It's a direction. You're heading the right way, even if you can't see the end from here.`,
      `The hardest step wasn't the first one. It was the one you took when everything inside you said stop. And you took it anyway.`,
      `You realize that every expert was once where you are now — confused, uncertain, one step away from giving up. They kept going. So will you.`,
      `The proof of learning isn't what you know. It's what you do differently when no one's watching. That's where the real change lives.`,
      `You close this chapter not with a trophy, but with a scar. And scars are better — they remind you of what you survived to earn them.`,
      `The insight you gained today will look different tomorrow. That's not a bug. It's a feature. Understanding deepens with every revisit.`,
      `You thought you were learning a skill. What you were really learning was how to trust yourself. And that changes everything.`,
      `The world doesn't care that you learned something. But you do. And that's enough. The internal shift is the only reward that matters.`,
      `You didn't conquer ${title}. You befriended it. And friendship lasts longer than conquest.`,
      `The lesson is simple. Living it is hard. But you're living it now, and that makes all the difference.`,
      `You realize that the opposite of knowledge isn't ignorance. It's the illusion of knowledge. True learning begins when you admit you don't know.`,
      `Every master was once a disaster. The gap between them isn't talent — it's the number of times they refused to quit. You just added one more to your count.`,
      `The room is quiet now. The struggle is over. But the change is just beginning. You'll feel it tomorrow when you face something familiar and react differently.`,
      `You weren't tested to see if you could get it right. You were tested to see if you'd keep going when you got it wrong. You passed.`,
      `The answer was there all along. But you had to go through the confusion to recognize it. The detour was the destination.`,
      `You can't become who you want to be by staying who you are. Every lesson stretches you. Today, you stretched.`,
      `The seed of understanding was planted. It will grow quietly over the next days and weeks. You'll notice its effects before you remember its origin.`,
      `Not every lesson feels like progress. Some feel like setbacks. But the setback is the progress in disguise. Trust the process.`,
      `You've earned something today that can't be taken away: proof that you can face the unknown and come out the other side.`,
      `The breakthrough felt small. But small breakthroughs compound. This one will echo through decisions you haven't made yet.`,
      `You didn't need more information. You needed a new way to see the information you already had. Now you have it.`,
      `The learning happened in the space between trying and failing and trying again. Not in the success — in the return.`,
      `You understand now that understanding is never finished. It's a conversation you keep having with the world. Today was a good chapter.`,
      `The cost of learning is discomfort. The cost of not learning is stagnation. You chose to pay the first. It was the right choice.`,
      `You step away from this experience different. Not because the experience was extraordinary — but because you showed up for it fully.`,
      `The real test won't be today. It'll be next week, when the memory fades and the habit tries to reassert itself. That's when the learning proves itself.`,
    ];
    const hook = pool[h % pool.length];
    const closing = closings[Math.abs(h + h2) % closings.length];
    return `${hook}\n\n${closing}`;
  }

  function generateNodeContent(label: string, moduleTitle: string, index: number): string[] {
    const themes = [
      [
        `Your hands are cold. The moment you've been preparing for is here, and nothing feels prepared. The noise of the world fades as you focus on ${label}.`,
        `You check your phone, then put it down. Distraction is the enemy of depth, and depth is what ${moduleTitle} demands.`,
        `Your breathing slows. The racing thoughts settle into a single point of attention. You're ready to begin.`,
        `The first step is clumsy. You fumble, almost drop it, catch yourself. That's fine. First steps always look like this.`,
        `Someone asks if you're okay. You nod, but you're not sure. You've never done this before, and the uncertainty is a physical weight.`,
        `But something shifts. The uncertainty doesn't disappear, but it becomes familiar. You start to recognize its shape.`,
        `You make your first real attempt. It's not pretty. It's not smooth. But it's real, and real is better than perfect.`,
        `A small detail catches your attention. You'd have missed it if you were still hesitating. Being in motion reveals what standing still hides.`,
        `You pause to breathe. The air is sharp, cold in your lungs. The moment stretches.`,
        `You realize you're no longer thinking about doing it right. You're just doing it. The thinking was the obstacle.`,
        `Your phone buzzes. You ignore it. An hour ago you couldn't have. What changed?`,
        `The next step comes naturally. Not because it's easy, but because your body has started to learn what your mind was struggling to teach.`,
        `A mistake. A real one. Your stomach drops. But instead of stopping, you keep moving. The mistake becomes part of the rhythm.`,
        `You catch yourself smiling. Not because anything is funny — because something is working. The feeling is unfamiliar but welcome.`,
        `You look back at where you started. The distance is small but significant. You've crossed a line you couldn't see before.`,
        `${label} is no longer a concept you're studying. It's something you're doing. The gap between knowing and understanding is narrowing.`,
        `Your hands don't tremble anymore. The nervous energy has transformed into something useful — attention, presence, flow.`,
        `You realize the resistance you felt at the beginning wasn't fear of failure. It was fear of starting. And now you've started.`,
        `The path ahead isn't clear, but that's okay. The first step was the hardest, and you took it.`,
        `You close this phase with a quiet acknowledgment: you showed up. That's the victory. Everything else is just practice.`,
      ],
      [
        `Your stomach tightens. The familiar landmarks are gone. Everything you thought you knew about ${moduleTitle} doesn't apply here.`,
        `This is new territory. Uncharted. The map in your head is blank, and your instinct is to turn back.`,
        `A voice whispers: "You're not ready for this." You hear it, acknowledge it, and keep moving. Being unready is how you get ready.`,
        `Your first attempt feels wrong. Awkward. Like wearing shoes on the wrong feet. But you keep going.`,
        `Someone watching might think you're confident. You're not. You're just refusing to let the discomfort stop you.`,
        `The unfamiliarity is a physical sensation — a tightness in your chest, a heat behind your eyes. You breathe through it.`,
        `You try something different. It doesn't work either. But each wrong attempt reveals something about what might be right.`,
        `You catch a glimpse of understanding — a flash, not a full picture. But it's enough to know you're heading in the right direction.`,
        `Your mind reaches for comparisons, for shortcuts, for something familiar to hold onto. There's nothing. You're truly learning something new.`,
        `Fatigue sets in, but it's a good fatigue. The kind that comes from using parts of your brain that have been dormant.`,
        `You ask a question you've never asked before. The question itself is progress. The answer can wait.`,
        `You look at ${label} from a different angle. The shape changes. What seemed like a wall might be a door.`,
        `Your confidence wavers. One moment you feel it, the next it's gone. The instability is part of the process.`,
        `You commit to the next step without knowing where it leads. Trust replaces certainty.`,
        `The ground shifts under your feet. You adjust. Adaptation isn't weakness — it's the entire point.`,
        `You notice a pattern you missed before. Small, subtle, but significant. The territory is becoming navigable.`,
        `Your breathing steadies. The tightness in your chest loosens. The unfamiliar is becoming familiar.`,
        `You haven't mastered ${label}, but you've made peace with not mastering it. Peace is the foundation of progress.`,
        `You take a step back. The landscape is starting to have shape. Not a map yet, but a sketch.`,
        `You continue forward. The unfamiliarity isn't scary anymore. It's just... new. And new is where growth lives.`,
      ],
      [
        `You thought you understood. Now you realize you were barely scratching the surface. ${moduleTitle} has depth you didn't anticipate.`,
        `Each layer you peel reveals another layer underneath. Progress feels like regression — you're discovering how much you don't know.`,
        `You try to simplify, but the simplification distorts the truth. ${label} refuses to be reduced.`,
        `Frustration rises. Not the surface kind — a deep, aching frustration that makes you want to walk away.`,
        `You sit with the frustration instead of escaping it. It's uncomfortable, but it's honest.`,
        `A question forms: "What am I missing?" The question is more valuable than any answer you've found so far.`,
        `You go back to the beginning and re-examine your assumptions. One of them is wrong. You can feel it.`,
        `The wrong assumption is hard to find because it's been there the longest. It feels like truth because it's familiar.`,
        `You challenge it. The structure wobbles. For a moment, you're afraid it will all collapse.`,
        `It doesn't collapse. It rearranges. The new shape is less comfortable but more accurate.`,
        `You test the new understanding. It holds. A small piece of the puzzle clicks into place.`,
        `But the click reveals three more gaps you hadn't seen before. The depth keeps extending.`,
        `You take a deep breath. ${label} is teaching you patience — not the passive kind, but the active kind that keeps going without immediate reward.`,
        `You realize that the frustration was a sign you were approaching something real. Surface learning doesn't frustrate. It bores.`,
        `The complexity isn't an obstacle. It's the content. The depth IS the lesson.`,
        `You push deeper. The work is harder now, but it matters more. The stakes feel higher because the understanding is real.`,
        `A connection emerges between ${moduleTitle} and something seemingly unrelated. The cross-wiring creates a spark.`,
        `You document the connection. It might be the most valuable thing you've discovered today.`,
        `You close this layer knowing there are more. The knowing isn't discouraging. It's motivating.`,
        `The depth isn't infinite. But the path to the bottom is longer than you thought. You're okay with that.`,
      ],
      [
        `Everything is falling apart. The plan you had is useless. ${moduleTitle} is fighting back.`,
        `Your first reaction is panic. Your second is blame. Your third — the one you choose — is curiosity.`,
        `You look at the obstacle closely. What is it made of? What is it protecting? What is it teaching?`,
        `The obstacle isn't an enemy. It's a filter. Only those who persist past the frustration get to the real lesson.`,
        `You try to force your way through. It doesn't work. The obstacle is designed to resist force.`,
        `You step back and ask: "What would work?" The question changes your relationship with the problem.`,
        `A different approach appears. Not obvious. Not easy. But possible.`,
        `You take the unfamiliar path. It feels wrong — every instinct says no — but you trust the process.`,
        `The path curves. The obstacle that seemed like a wall becomes a narrow passage. You weren't supposed to go over it. You were supposed to go through it.`,
        `The passage is tight. Uncomfortable. You have to shed some of what you're carrying — assumptions, pride, certainty.`,
        `You let go of the weight. It hurts. But you move forward.`,
        `On the other side, the landscape opens up. You can see further now. The obstacle gave you elevation.`,
        `You look back at the wall. From this side, it looks different. It wasn't blocking you. It was redirecting you.`,
        `${label} has taught you that the path of least resistance is not always the path of most growth.`,
        `You're tired. The struggle took more out of you than you expected. But you're further along than you would have been without it.`,
        `You rest. Your muscles ache — not physical muscles, but the ones that hold your attention and resolve.`,
        `When you resume, the work flows differently. The resistance has been metabolized into momentum.`,
        `You realize that obstacles are not deviations from the path. They ARE the path. Every wall you climb changes you.`,
        `You carry the lesson of this obstacle forward. Next time, you'll recognize a wall for what it is — a teacher in disguise.`,
        `The obstacle is behind you. But its effect on you is just beginning. You're not the same person who hit it.`,
      ],
      [
        `The moment crystallizes. All the preparation, the doubt, the waiting — it funnels into this single point. ${moduleTitle} is happening now.`,
        `Your heart pounds. Not from fear — from readiness. The adrenaline is fuel, not poison.`,
        `${label} asks everything of you. No half-measures. No backup plan. Full presence.`,
        `Your hands move before your mind fully catches up. They know what to do even when you're still doubting.`,
        `The first interaction is messy. You recover. The second is smoother. By the third, you're in rhythm.`,
        `Someone challenges you. Your defensiveness spikes — then drops. You chose learning over being right.`,
        `The conversation deepens. The stakes get higher. Everything you've learned so far is being tested.`,
        `You hold your ground where it matters and yield where it doesn't. The discernment is new. It's growing.`,
        `A breakthrough arrives in the middle of the exchange. Not from you — from the interaction itself.`,
        `You capture it. Write it down mentally. This moment matters.`,
        `Momentum builds. Each step generates energy for the next. You're not driving the process anymore — you're riding it.`,
        `You make a mistake. A real one. But instead of spiraling, you adjust. The recovery is faster than it would have been yesterday.`,
        `The mistake becomes part of the flow. You incorporate it. The imperfection makes the work human.`,
        `You push further. The edge of your capability is closer than you thought. But it's expanding.`,
        `The edge isn't a wall. It's a horizon. It moves as you approach it.`,
        `You're fully engaged. No phone, no distraction, no internal monologue. Just the work and you.`,
        `A small victory arrives. You allow yourself to feel it. Not for long — just long enough to register that progress happened.`,
        `The energy begins to wane. You've given what you could. The tank isn't empty, but it's low.`,
        `You close with intention. Not stopping — completing. There's a difference.`,
        `You step back. The moment is over. But what happened in it is now part of you.`,
      ],
      [
        `You realize you've been blind to something obvious. ${moduleTitle} was hiding in plain sight, and you walked past it every day.`,
        `The insight arrives quietly — no fanfare, no dramatic realization. Just a quiet "oh" as the pieces click together.`,
        `You see it now. The pattern you missed. The connection you overlooked. The assumption you never questioned.`,
        `You feel a mix of embarrassment and excitement. Embarrassment at the oversight. Excitement at what the new view reveals.`,
        `The obvious answer wasn't wrong — it was incomplete. ${label} fills the gap you didn't know existed.`,
        `You revisit your earlier conclusions. Some hold up. Others crumble. The crumbling is progress.`,
        `Rebuilding from the new foundation is faster than building from scratch. You're not starting over — you're starting from a better place.`,
        `The same evidence looks different now. The facts haven't changed. Your interpretation has.`,
        `You test the new interpretation. It explains more than the old one. It's simpler. More elegant.`,
        `A question lingers: "What else am I missing?" The question keeps you humble. Humble is how you keep discovering.`,
        `You share the insight with someone. They see it too. The shared understanding deepens it further.`,
        `You realize that ${moduleTitle} wasn't hiding. You weren't ready to see it. The readiness was the missing piece.`,
        `You incorporate the new view into your mental model. The structure is stronger now. More complete.`,
        `A small doubt remains. You welcome it. Doubt prevents dogma. Dogma is the death of learning.`,
        `You proceed with the new understanding. It changes how you approach everything — not just ${label}, but the broader landscape.`,
        `The shift feels natural now, but you remember when it felt impossible. That memory keeps you compassionate toward others who haven't seen it yet.`,
        `You realize that every insight you have is someone else's obvious truth. The cycle of discovery never ends.`,
        `You document the blind spot you uncovered. Future you might need the reminder.`,
        `The embarrassment has faded. What remains is gratitude — for the discomfort that led to the discovery.`,
        `You look again. What else is hiding in plain sight? The question becomes a habit.`,
      ],
      [
        `Someone says something that contradicts everything you thought about ${moduleTitle}. Your first reaction is rejection.`,
        `You catch yourself. The rejection was automatic — a reflex, not a response. You choose to pause.`,
        `The contradiction sits in front of you. Your mind wants to resolve it, dismiss it, or distort it. You resist all three.`,
        `You hold the tension. Your perspective AND their perspective. Both can't be right. But both might be useful.`,
        `The discomfort is physical. A knot in your stomach. A pressure behind your eyes. You stay with it.`,
        `${label} demands that you sit in the space between opposing ideas. Not to choose — to integrate.`,
        `A third possibility emerges from the space between. It wasn't visible from either side alone.`,
        `The third option isn't compromise. It's synthesis. Something new that contains both truths.`,
        `You test the synthesis. It holds. It explains more than either side alone.`,
        `You thank the person who challenged you. Not for agreeing with you — for helping you see further.`,
        `You revisit your original position. Parts of it were right. Parts were limited by what you couldn't see.`,
        `Revision isn't defeat. It's growth. You update your understanding and move forward.`,
        `The updated understanding changes how you approach ${moduleTitle}. The model is richer now. More nuanced.`,
        `You apply the new understanding. The results are different. Better.`,
        `A new question arises that the new model can't answer yet. Good. The cycle continues.`,
        `You welcome the next contradiction. You've learned that it's not an attack on your position — it's an invitation to expand it.`,
        `${label} has shown you that certainty is comfortable but limiting. Curiosity is uncomfortable but expansive.`,
        `You move forward with more questions than answers. That's not confusion. That's growth.`,
        `You note the key insight from this exchange. It will serve you.`,
        `The conversation is over, but its effect continues. The contradiction is now part of your thinking.`,
      ],
      [
        `You step away from the noise. No notifications, no conversations, no demands. Just you and ${moduleTitle}.`,
        `The silence is uncomfortable at first. Your mind reaches for distraction like a reflex. You let it reach and find nothing.`,
        `A thought surfaces — one you've been avoiding. In the silence, it can't hide. You face it.`,
        `The thought tells you something you needed to hear. Something only silence could deliver.`,
        `You write it down. The physical act of writing makes it real. The ink on paper is a contract with yourself.`,
        `You return to the work. The quality of your attention has shifted. Deeper. More precise.`,
        `${label} requires this kind of depth. Not constant depth, but regularly. The deep sessions are where the real breakthroughs live.`,
        `You proceed slowly. The work isn't a race. It's a conversation between you and the material.`,
        `A decision emerges from the quiet. It feels different from decisions made in noise. More aligned. More true.`,
        `You trust the decision because it came from depth. Not from pressure or panic or pride.`,
        `You check the decision against the quiet feeling in your chest. It resonates. The alignment is physical.`,
        `You realize that ${moduleTitle} isn't mastered through intensity. It's mastered through intimacy — spending time alone with it.`,
        `The solitude becomes something you seek rather than endure. It's not loneliness. It's the space where your own thoughts can be heard.`,
        `You emerge from solitude changed. No one notices but you. The change is invisible but real.`,
        `You carry the quiet back into the world. It becomes a shield against the noise that tries to pull you back to the surface.`,
        `The next time you need to go deep, you know where to go. The silence is always there, waiting.`,
        `You've built a practice that transcends ${label}. The ability to sit alone with difficulty is a meta-skill.`,
        `You close the session. The quiet lingers. It colors everything you do next.`,
        `You look forward to the next solitary session. Not because you're antisocial — because some things can only be discovered alone.`,
        `The solitude has given you something no conversation could. Something that belongs only to you.`,
      ],
      [
        `You're in a room with others who care about ${moduleTitle}. The energy is different. Ideas bounce and multiply.`,
        `Someone says something that sparks a thought. You build on it. Someone else builds further. The idea grows beyond any individual.`,
        `${label} is tested from every angle. Some angles reveal strengths. Others reveal cracks. Both are valuable.`,
        `You contribute your perspective. Someone challenges it. Instead of defending, you explore. The exploration leads somewhere unexpected.`,
        `The collective understanding deepens faster than any individual study could. The group accelerates everyone.`,
        `You notice a dynamic in the group — a pattern that mirrors what you're studying about ${moduleTitle}. The meta-layer is fascinating.`,
        `You point out the pattern. The group pauses. Recognition spreads. The discussion becomes about itself.`,
        `Someone disagrees with you. You don't take it personally. The idea is being tested, not you.`,
        `You refine your position in response to the challenge. It gets sharper. Clearer. More defensible.`,
        `The group converges on an insight that none of you could have reached alone. The collective intelligence is palpable.`,
        `You feel the power of shared exploration. It's different from solo work. Both are necessary.`,
        `You make a note of what emerged from the group. It's richer than what you came with.`,
        `You realize that ${label} isn't just personal — it's relational. Some insights require another mind to catalyze.`,
        `The best moments come from the space between people, not from inside one head. You've experienced it now.`,
        `You leave the group with more than you brought. The learning was multiplied, not just added.`,
        `You reflect on the experience. Solitude gives depth. Community gives breadth. Both are essential.`,
        `You seek out more opportunities to learn in community. The group dynamic is a skill itself.`,
        `${moduleTitle} makes more sense now because you've seen it through others' eyes. The multiple perspectives enrich your own.`,
        `You carry the group's energy with you. It sustains you through the solitary work ahead.`,
        `The conversation is over, but the connections remain. You're part of a web of learners now.`,
      ],
      [
        `You stand at a crossroads. Multiple paths stretch ahead, each with unknown consequences. ${moduleTitle} is the frame for this decision.`,
        `Your stomach tightens. The weight of choosing is real. Not choosing is also a choice, and often the worst one.`,
        `You examine each option. Not just logically — you feel into each one. What does your body say?`,
        `One option feels safe. Another feels right. They're not the same thing. The gap between them is where the real choice lives.`,
        `You identify what you're afraid of losing. That fear is information. It tells you what you value.`,
        `You identify what you hope to gain. That hope is also information. It tells you where you want to grow.`,
        `The data is incomplete. It will always be incomplete. Waiting for full information is a form of paralysis.`,
        `You make the call. Not with certainty — with commitment. Certainty is overrated. Commitment is what carries you through.`,
        `The moment after the decision is strange. Relief mixed with doubt. You sit with both.`,
        `You inform the people who need to know. Their reactions vary. Some support. Some question. You hold your ground without being rigid.`,
        `The first consequence arrives. It's not what you expected. You adjust without regretting the original choice.`,
        `${label} has taught you that decisions are hypotheses, not verdicts. You test, learn, and iterate.`,
        `You track the outcomes dispassionately. What worked? What didn't? The data from your own choices is the most valuable learning material.`,
        `You discover that the quality of your decision-making improved through the process, regardless of the outcome.`,
        `The next decision comes sooner than you expected. You face it with more experience and less fear.`,
        `You realize that ${moduleTitle} is a decision-making muscle. Each choice strengthens it.`,
        `You thank the situation for testing you. Not because it was easy — because it made you stronger.`,
        `You close the decision chapter. The outcome is still unfolding. But the process was sound, and you trust it.`,
        `You feel more capable of handling ambiguity. The muscle is growing. Invisible but real.`,
        `You move to whatever comes next. The decision is behind you. The learning is with you.`,
      ],
      [
        `You're explaining ${moduleTitle} to someone else. The words feel different coming out than they did in your head.`,
        `You stumble on a concept you thought you understood. The gap in your understanding is exposed immediately.`,
        `You don't hide the stumble. You show them how you recover. The recovery is more valuable than the perfection would have been.`,
        `They ask a question you can't answer. You say "I don't know" and explore it together. The honesty deepens the trust.`,
        `The exploration goes deeper than any prepared lesson. Their fresh perspective sees things you've stopped noticing.`,
        `You realize that teaching isn't about transmitting knowledge. It's about modeling the relationship with not-knowing.`,
        `Your student makes a connection you hadn't seen. They just taught you something. The hierarchy dissolves.`,
        `You're co-learners now. The distinction between teacher and student is blurring. This is the deepest form of learning ${moduleTitle}.`,
        `You document what emerged from the exchange. It's different from what you planned. It's better.`,
        `${label} becomes clearer as you articulate it. The act of teaching is the act of understanding more deeply.`,
        `The student's progress becomes your progress. Learning is contagious. Their "aha" echoes in your own understanding.`,
        `You feel the satisfaction of helping someone else's understanding grow. It's different from personal achievement. More expansive.`,
        `You notice that teaching reinforces your own learning in ways that studying alone never could. The reciprocity is real.`,
        `You commit to teaching ${moduleTitle} more often. Not because you're an expert — because teaching is the fastest path to expertise.`,
        `The session ends. Both of you have grown. The measure isn't what you taught. It's what was learned.`,
        `You reflect on what you learned from teaching. The list is substantial. The student's questions pushed you further than your own ever did.`,
        `You schedule the next session. Consistency compounds. Teaching becomes a practice, not an event.`,
        `${moduleTitle} becomes a shared journey. The solo path was informative. The shared path is transformative.`,
        `You realize that the best way to learn is to teach. Not because teaching proves mastery — because teaching reveals gaps.`,
        `You carry the student's questions with you. They'll continue to work on you long after the session.`,
      ],
      [
        `You return to ${moduleTitle} after time away. It feels like visiting a place you used to live. Familiar but distant.`,
        `The notes you took before look different now. You were a different person when you wrote them.`,
        `You see what you missed the first time. The material hasn't changed — you have. The difference is the learning.`,
        `A concept that seemed confusing before now seems obvious. The confusion was necessary. It was the doorway.`,
        `You notice how much you've internalized. ${label} is part of your thinking now, even when you're not consciously applying it.`,
        `The return teaches you that learning isn't linear. It's a spiral. You pass the same points, but at a higher level.`,
        `The earlier version of you needed different things from ${moduleTitle}. That version was doing their best with what they had.`,
        `This version of you asks different questions. Deeper questions. The answers are deeper too.`,
        `You appreciate the growth. Not in what ${label} is, but in how you relate to it. The relationship has matured.`,
        `It's less about proving and more about practicing. Less about understanding and more about inhabiting.`,
        `You engage with the material more gently. Less grasping. More receiving. The insights come without force.`,
        `You trust the process more than you did before. The trust isn't blind — it's earned through experience.`,
        `You realize that ${moduleTitle} will keep revealing itself as you grow. There's no final understanding.`,
        `This isn't frustrating. It's liberating. The learning never ends, which means the growth never ends.`,
        `You close the session with appreciation for the spiral. Not for reaching the top — for being on the journey.`,
        `You look forward to the next return. It will show you how much more you've grown.`,
        `${moduleTitle} is a lifelong conversation. You're showing up for it, again and again.`,
        `The conversation evolves as you evolve. The material is the same. You are not.`,
        `You leave the spiral at a higher point than you entered it. The elevation is invisible but real.`,
        `The return has reminded you why you started. The reason is as valid now as it was then. More valid, actually.`,
      ],
      [
        `You hit a wall. Not the motivational kind — a real limit in your understanding. ${moduleTitle} has a ceiling you can't push through alone.`,
        `Your first instinct is to push harder. To brute force your way through. It doesn't work. The wall is stronger than your effort.`,
        `You step back. The ceiling is telling you something. It's saying: "You need something you don't have yet."`,
        `Acknowledging the limit isn't failure. It's accuracy. And accuracy is the first step to growth.`,
        `You identify what you're missing. A perspective. A skill. A resource. The missing piece is specific.`,
        `You ask for help. It's humbling. Your voice shakes when you say "I don't know." But you say it.`,
        `Someone who has passed this boundary shares their map. The map doesn't eliminate the climb. But it shows the route.`,
        `You start climbing with the map in hand. It helps, but the climb is still yours to make.`,
        `You encounter terrain the map didn't cover. The map is a guide, not a guarantee. You adapt.`,
        `Your own experience becomes part of the map. The next person at this boundary will benefit from your passage.`,
        `You pass the ceiling that stopped you. The landscape beyond is unexpected. ${moduleTitle} expands in ways you couldn't see from below.`,
        `You look back at the ceiling. From above, it looks different. It wasn't a limit. It was a threshold.`,
        `Thresholds require help to cross. That's by design. No one masters ${label} alone.`,
        `You feel gratitude for the person who helped you. Not because they carried you — because they showed you the path.`,
        `You offer to help the next person at this threshold. The cycle continues. Teaching and learning merge.`,
        `${moduleTitle} is deeper now because you've seen its limits. The boundaries are part of the territory.`,
        `Limits are where learning concentrates. The ceiling was the most productive part of the journey.`,
        `You've grown more from this wall than from a hundred easy steps. The resistance created the growth.`,
        `You continue, carrying the map and adding to it. The next ceiling will come. You'll know what to do.`,
        `The wall wasn't an end. It was a gate. And you have the key now.`,
      ],
      [
        `You discover that ${moduleTitle} contains a contradiction. Two truths that seem to oppose each other.`,
        `Your mind wants to resolve the tension. To pick one side and dismiss the other. You resist the urge.`,
        `You hold both truths simultaneously. It's uncomfortable. Your brain protests. The discomfort is productive.`,
        `You explore the conditions under which each truth holds. Each is valid in its context. The context is the key.`,
        `The boundary between them reveals more than either truth alone. The edge is where the insight lives.`,
        `You realize that ${moduleTitle} isn't a set of rules. It's a field of tensions. Navigating tensions is the real skill.`,
        `Someone asks for a simple answer. You can't give one. The question deserves more than simplicity.`,
        `You explain the tension instead of resolving it. They see the depth. The conversation enriches both of you.`,
        `${label} has taught you that paradox is productive. The space between opposing ideas is generative.`,
        `You become more comfortable with not knowing. Not knowing is the precondition for learning.`,
        `The comfort with ambiguity is a measure of growth. You test it. It's growing.`,
        `You apply this comfort to other areas of life. The skill of holding paradox spreads beyond ${moduleTitle}.`,
        `The contradiction hasn't been resolved. It's been integrated. Integration is better than resolution.`,
        `You feel your thinking becoming more nuanced. Less binary. More capable of holding complexity.`,
        `The nuance doesn't make you indecisive. It makes your decisions more informed. You see more of the picture.`,
        `You share the tension with someone else. They see the depth. The shared exploration adds another dimension.`,
        `You continue holding the contradiction. It becomes generative. New insights arise from the space between.`,
        `${moduleTitle} gave you a gift beyond its content: a new way to hold complexity.`,
        `The tension remains. But it's no longer a problem to solve. It's a resource to draw from.`,
        `You move forward. The paradox doesn't paralyze you — it expands you.`,
      ],
      [
        `You step back from the details. The trees have been obscuring the forest. ${moduleTitle} has a shape you couldn't see up close.`,
        `From a distance, the pattern emerges. What seemed random is connected. The connections form a structure.`,
        `You see how the pieces fit together. The fit is elegant. The design wasn't arbitrary — it was necessary.`,
        `The pattern reveals a principle you hadn't identified. The principle generalizes beyond ${moduleTitle}.`,
        `You see echoes of the pattern in other areas of your life. The same structure appears in different domains.`,
        `You realize that ${moduleTitle} is teaching you pattern recognition, not just facts. The meta-skill transcends any single domain.`,
        `You feel the shift from learning content to learning how to learn. This is the inflection point.`,
        `${label} becomes a lens. A way of seeing the world. It's no longer something you study — it's something you see through.`,
        `You test the lens on a new problem. It works. The pattern transfers.`,
        `The lens isn't perfect. It has blind spots. You note them. The act of noting is itself a refinement of the lens.`,
        `You refine the lens based on what it misses. Each blind spot you find makes the lens more precise.`,
        `The process of refining is itself the practice of ${moduleTitle}. The content and the method are the same.`,
        `You appreciate the depth that comes from standing back. Close work reveals details. Distance reveals structure.`,
        `You commit to regular perspective shifts. Zoom in for details. Zoom out for pattern. The rhythm is the practice.`,
        `${moduleTitle} keeps giving as you keep looking. The depth is inexhaustible.`,
        `You look at a new situation and recognize the pattern immediately. The recognition is automatic now.`,
        `The pattern recognition is becoming instinct. You're no longer applying ${label} — you're embodying it.`,
        `You share the pattern with someone who's stuck in the details. Your perspective helps them step back too.`,
        `The teaching reinforces your understanding. The cycle feeds itself.`,
        `You close the session with a broader view. Not just of ${moduleTitle}, but of how learning itself works.`,
      ],
      [
        `You make something real with ${moduleTitle}. Theory leaves your head and enters the world.`,
        `${label} takes physical form. It exists outside your mind now — imperfect, tangible, alive.`,
        `The making reveals gaps in your understanding. The idea was clean. The reality is messy. The mess is where the real learning happens.`,
        `You solve problems as they arise. Each solution teaches you something no book could.`,
        `The thing you're making develops its own logic. It pushes back. It has opinions. You learn to listen.`,
        `${moduleTitle} becomes a dialogue between you and what you're creating. The dialogue is the learning.`,
        `You make a mistake that can't be undone. You work with it instead of against it. The mistake becomes a feature.`,
        `Constraints become creative. The limits of the medium force you to innovate. Innovation is the child of limitation.`,
        `You find a solution that's better than your original plan. It came from engaging with reality, not avoiding it.`,
        `The satisfaction is different from understanding. Deeper. More complete.`,
        `Making connects you to ${moduleTitle} in a way that reading never could. You understand because you did.`,
        `Application is the completion of learning. Without it, understanding is incomplete. A half-truth.`,
        `You look at what you've made. It's imperfect. But it's yours. The imperfection holds the lessons.`,
        `A perfect result would have taught less. The flaws are the curriculum.`,
        `You start the next iteration with more wisdom. The first version was practice. The real work begins now.`,
        `${label} has become part of your hands, not just your head. The knowledge is embodied.`,
        `You realize that the gap between knowing and doing is where mastery lives. You've narrowed the gap.`,
        `You show what you've made to someone. Their feedback is valuable not for validation, but for the next iteration.`,
        `The cycle of make, test, learn, repeat is the engine of growth. You've built the engine.`,
        `You close the making session. The thing you made exists. You existed differently while making it.`,
      ],
      [
        `You fail. Not a small stumble — a real, visible failure. ${moduleTitle} defeated you this round.`,
        `The first feeling is raw. Shame, anger, the urge to disappear. You let the feeling pass through without acting on it.`,
        `You examine the failure closely. Not to assign blame — to understand its structure.`,
        `The failure has anatomy. It happened in a specific sequence. Specific choices led to specific outcomes.`,
        `You identify what was within your control and what wasn't. You focus on the first and release the second.`,
        `The failure taught you more than success would have. The lesson is encoded in the sting.`,
        `You extract the lesson. It's clear because you paid the price. Expensive lessons are the ones you remember.`,
        `You commit to applying the lesson. The failure will not be wasted. It will be tuition.`,
        `You share the failure with someone. They learn without paying the same price. Your vulnerability becomes their shortcut.`,
        `${label} is learned through cycles of failure and recovery. The recovery is the actual skill.`,
        `You've recovered. Not fully — the bruise is still there. But you're moving again. Movement is recovery.`,
        `You're different now. Not harder — more flexible. The failure broke something rigid in you.`,
        `You approach ${moduleTitle} again. The second attempt is informed by the first failure. You're not starting over. You're starting smarter.`,
        `Progress is modest. That's okay. Any progress after failure is a victory.`,
        `You mark this failure as a milestone. Not a scar — a milestone. It marks how far you've come.`,
        `You continue. Not despite the failure — because of it. The failure is now part of your foundation.`,
        `${moduleTitle} has more to teach you. The failure didn't close the door — it showed you where the door really is.`,
        `You feel a strange gratitude for the experience. Not for the pain — for what the pain revealed.`,
        `You carry the lesson forward. The next time you face a similar situation, you'll recognize it before it becomes a failure.`,
        `Failure isn't the end of learning. It's the most concentrated form of learning. You've been concentrated.`,
      ],
      [
        `You're in the final stretch. The end of this ${moduleTitle} journey is visible. A mix of relief and reluctance stirs in your chest.`,
        `The temptation to rush is strong. You've been at this for a while. You want it done. But the last steps matter.`,
        `You slow down instead of speeding up. The final details are where the learning crystallizes.`,
        `A final obstacle appears — testing whether you've really learned or just accumulated information.`,
        `You face it with everything you've gathered. It's enough. The obstacle was the final exam, and you pass.`,
        `You cross the finish. The feeling isn't dramatic. It's quiet. A soft satisfaction rather than a loud victory.`,
        `You look back at the path. The struggles have receded. The growth remains. The view from here is worth the climb.`,
        `You realize ${moduleTitle} changed you. Not in a way others can see — in a way you can feel.`,
        `The internal shift is the real achievement. The content was just the vehicle.`,
        `You reflect on what you'd tell your earlier self. The advice is simple: start sooner, trust the process, embrace the struggle.`,
        `You document what you learned. The documentation is a gift to future you.`,
        `You celebrate, even if quietly. Completion deserves acknowledgment. Not for the grade — for the journey.`,
        `The celebration isn't about mastering ${label}. It's about not quitting. Persistence is the real achievement.`,
        `You rest. Integration happens in rest. The learning needs time to settle into your bones.`,
        `You sense the next horizon. There's always more. The end of this module is the beginning of something else.`,
        `But for now, you pause. The pause is part of the learning cycle. Skipping the pause skips the integration.`,
        `You feel ready for what's next, even without knowing what it is. The readiness is the real outcome.`,
        `${moduleTitle} has prepared you for more than this moment. It's prepared you for all the moments after.`,
        `You close the book. Not forever — just for now. The learning continues in the living.`,
        `The finish isn't a destination. It's a viewpoint. You can see further from here.`,
      ],
      [
        `You return to the beginning of ${moduleTitle}. The circle closes. The start looks different now.`,
        `${label} at the start was one thing. Now it's something else. The content hasn't changed. You have.`,
        `You see your earlier notes with new eyes. That person was trying so hard. You feel tenderness for them.`,
        `The beginner's mind you had at the start is gone. You've gained expertise. But expertise has its own blindness.`,
        `You try to see ${moduleTitle} as if for the first time. It's impossible. But trying keeps you humble.`,
        `Humility is the gift of the return. You know enough to know how much you don't know.`,
        `You notice how much you've internalized. ${label} is part of your thinking now. You use it without thinking about using it.`,
        `Integration is the final stage. It's invisible. It changes everything.`,
        `You help someone who's where you started. The cycle continues. Teaching is the completion of learning.`,
        `You're both student and teacher now. The roles blend. ${moduleTitle} has made you both.`,
        `${moduleTitle} has become part of your ecosystem. It will evolve as you evolve.`,
        `You feel gratitude for the journey. For the struggle. For the growth. For everyone who helped along the way.`,
        `You carry ${label} into whatever comes next. Not as a burden — as a tool. A lens. A part of you.`,
        `The circle isn't really closed. It's a spiral. You're on the next loop, higher than before.`,
        `You can see more from here. The landscape is wider. The next challenge is visible on the horizon.`,
        `You're ready for it. Not because you've mastered ${moduleTitle} — because you've learned how to learn.`,
        `The return has taught you that every ending is a beginning. The cycle is the point.`,
        `You close the circle with gratitude. Not farewell — see you on the next loop.`,
        `${moduleTitle} will be with you, always accessible, always deepening. That's the gift of true learning.`,
        `You step forward. The next spiral awaits. You're ready.`,
      ],
      [
        `You discover something unexpected. ${moduleTitle} has a side you never noticed. The discovery was accidental — the best kind.`,
        `You weren't looking for it. You were exploring, following curiosity rather than a plan. The detour was the real path.`,
        `The discovery connects ${moduleTitle} to something completely different. The connection wasn't visible before.`,
        `You follow the thread. It leads somewhere interesting — not directly related, but deeply connected.`,
        `Everything connects when you go deep enough. The separations between domains are illusions.`,
        `${label} was the entry point to a broader landscape than you knew existed.`,
        `You explore the broader landscape with curiosity. No goal. No deadline. Just wonder.`,
        `Wonder is the state where real learning happens. Not the pressured acquisition of knowledge — the open exploration of possibility.`,
        `You find a parallel between ${moduleTitle} and something from a completely different domain.`,
        `The parallel deepens your understanding of both. Cross-domain insights are the most powerful.`,
        `You note the parallel. It might become important later. Even if it doesn't, the act enriched your mind.`,
        `You return to ${moduleTitle} with new eyes. The side journey refreshed you. The main path looks different.`,
        `The detour was the real path. You didn't waste time — you invested it in breadth.`,
        `${label} keeps surprising you. That's the sign of a rich subject. It rewards continued attention.`,
        `You realize that the most important discoveries are the ones you weren't looking for.`,
        `You cultivate the conditions for discovery: curiosity, time, and the willingness to get lost.`,
        `The discovery isn't the end. It's the beginning of a new thread. The exploration continues.`,
        `You feel the excitement of finding something new. The feeling is the fuel for continued learning.`,
        `You carry the discovery forward. It becomes part of your understanding of ${moduleTitle}.`,
        `The unexpected discovery reminds you why you started learning in the first place: not for the answer, but for the joy of the search.`,
      ],
    ];
    return themes[index % themes.length].map((p) => p);
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
          { id: "e1-2", source: "1", target: "2", label: "Play it safe" },
          { id: "e1-3", source: "1", target: "3", label: "Take a risk" },
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
          { id: "e1-2", source: "1", target: "2", label: "Stay familiar" },
          { id: "e1-3", source: "1", target: "3", label: "Try unfamiliar" },
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
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "A Dilemma Appears", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Choose the Safer Option", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Take the Risky Bet", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Short-Term Peace of Mind", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Miss the Big Opportunity", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Early Setbacks Shake You", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Everything Goes Right", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Regret What Could Have Been", type: "process" },
          { id: "9", positionX: 100, positionY: 600, label: "Ok Outcome, No Regret", type: "process" },
          { id: "10", positionX: 500, positionY: 600, label: "Learn From Failure, Pivot", type: "process" },
          { id: "11", positionX: 900, positionY: 600, label: "Success on the First Try", type: "process" },
          { id: "12", positionX: 100, positionY: 800, label: "Stuck in What-Ifs", type: "end" },
          { id: "13", positionX: 500, positionY: 800, label: "Wiser but Wounded", type: "end" },
          { id: "14", positionX: 900, positionY: 800, label: "Victory Lap", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Play safe" },
          { id: "e1-3", source: "1", target: "3", label: "Go big" },
          { id: "e2-4", source: "2", target: "4", label: "Stay comfortable" },
          { id: "e2-5", source: "2", target: "5", label: "Look back" },
          { id: "e3-6", source: "3", target: "6", label: "It gets worse" },
          { id: "e3-7", source: "3", target: "7", label: "It pays off" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-11", source: "7", target: "11" },
          { id: "e8-12", source: "8", target: "12" },
          { id: "e9-13", source: "9", target: "13" },
          { id: "e10-13", source: "10", target: "13" },
          { id: "e11-14", source: "11", target: "14" },
        ],
      },
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "You Have Resources to Deploy", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Invest Everything Now", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Save and Wait", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Rapid Growth, High Risk", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Over-Extend and Struggle", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Miss the Window", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Deploy at the Right Time", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Win Big or Lose Everything", type: "process" },
          { id: "9", positionX: 100, positionY: 600, label: "Burnt Out and Broke", type: "process" },
          { id: "10", positionX: 500, positionY: 600, label: "Analysis Paralysis", type: "process" },
          { id: "11", positionX: 900, positionY: 600, label: "Maximized Return", type: "process" },
          { id: "12", positionX: -100, positionY: 800, label: "Jackpot or Bust", type: "end" },
          { id: "13", positionX: 500, positionY: 800, label: "Played It Safe, Minimal Gain", type: "end" },
          { id: "14", positionX: 900, positionY: 800, label: "Perfectly Timed Success", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Go all in" },
          { id: "e1-3", source: "1", target: "3", label: "Be patient" },
          { id: "e2-4", source: "2", target: "4", label: "Momentum" },
          { id: "e2-5", source: "2", target: "5", label: "Too much" },
          { id: "e3-6", source: "3", target: "6", label: "Wait too long" },
          { id: "e3-7", source: "3", target: "7", label: "Perfect timing" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-11", source: "7", target: "11" },
          { id: "e8-12", source: "8", target: "12" },
          { id: "e9-12", source: "9", target: "12" },
          { id: "e10-13", source: "10", target: "13" },
          { id: "e11-14", source: "11", target: "14" },
        ],
      },
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "You're Noticing a Problem", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Fix the Symptoms", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Diagnose the Root Cause", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Quick Relief, Problem Returns", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Patch It and Move On", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Root Cause Is Complex", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Root Cause Is Simple", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Chronic Repeat Failure", type: "process" },
          { id: "9", positionX: 100, positionY: 600, label: "Band-Aid Holds... For Now", type: "process" },
          { id: "10", positionX: 500, positionY: 600, label: "Deep Work Required", type: "process" },
          { id: "11", positionX: 900, positionY: 600, label: "One Change Fixes Everything", type: "process" },
          { id: "12", positionX: -100, positionY: 800, label: "Recurring Crisis Mode", type: "end" },
          { id: "13", positionX: 100, positionY: 800, label: "Temporary Stability", type: "end" },
          { id: "14", positionX: 500, positionY: 800, label: "Systematic Improvement", type: "end" },
          { id: "15", positionX: 900, positionY: 800, label: "Transformational Breakthrough", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Quick fix" },
          { id: "e1-3", source: "1", target: "3", label: "Deep dive" },
          { id: "e2-4", source: "2", target: "4", label: "Surface level" },
          { id: "e2-5", source: "2", target: "5", label: "Good enough" },
          { id: "e3-6", source: "3", target: "6", label: "Hard problem" },
          { id: "e3-7", source: "3", target: "7", label: "Leverage point" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-11", source: "7", target: "11" },
          { id: "e8-12", source: "8", target: "12" },
          { id: "e9-13", source: "9", target: "13" },
          { id: "e10-14", source: "10", target: "14" },
          { id: "e11-15", source: "11", target: "15" },
        ],
      },
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "You Have an Opportunity", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Go It Alone", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Bring in a Partner", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Full Control, Full Burden", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Limited by Your Own Skills", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Shared Vision, Stronger Together", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Conflict and Friction", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Burnout and Bottlenecks", type: "process" },
          { id: "9", positionX: 100, positionY: 600, label: "Slow and Steady Wins", type: "process" },
          { id: "10", positionX: 500, positionY: 600, label: "Compound Expertise", type: "process" },
          { id: "11", positionX: 900, positionY: 600, label: "Go Your Separate Ways", type: "process" },
          { id: "12", positionX: -100, positionY: 800, label: "Total Exhaustion", type: "end" },
          { id: "13", positionX: 300, positionY: 800, label: "Independent Success", type: "end" },
          { id: "14", positionX: 700, positionY: 800, label: "Unstoppable Duo", type: "end" },
          { id: "15", positionX: 900, positionY: 800, label: "Back to Square One", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Solo" },
          { id: "e1-3", source: "1", target: "3", label: "Partner" },
          { id: "e2-4", source: "2", target: "4", label: "Self-reliant" },
          { id: "e2-5", source: "2", target: "5", label: "Hit a wall" },
          { id: "e3-6", source: "3", target: "6", label: "Great chemistry" },
          { id: "e3-7", source: "3", target: "7", label: "Clash" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-11", source: "7", target: "11" },
          { id: "e8-12", source: "8", target: "12" },
          { id: "e9-13", source: "9", target: "13" },
          { id: "e10-14", source: "10", target: "14" },
          { id: "e11-15", source: "11", target: "15" },
        ],
      },
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "Time to Create Something", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Improve What Exists", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Invent Something New", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Incremental Improvement", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Get Out-Competed", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Breakthrough Innovation", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Nobody Wants It", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Steady but Unremarkable", type: "process" },
          { id: "9", positionX: 100, positionY: 600, label: "Left in the Dust", type: "process" },
          { id: "10", positionX: 500, positionY: 600, label: "Market Adoption Grows", type: "process" },
          { id: "11", positionX: 900, positionY: 600, label: "Pivot or Persevere", type: "process" },
          { id: "12", positionX: -100, positionY: 800, label: "Comfortable Mediocrity", type: "end" },
          { id: "13", positionX: 100, positionY: 800, label: "Obsolescence", type: "end" },
          { id: "14", positionX: 500, positionY: 800, label: "Industry Disruption", type: "end" },
          { id: "15", positionX: 900, positionY: 800, label: "Back to the Drawing Board", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Iterate" },
          { id: "e1-3", source: "1", target: "3", label: "Innovate" },
          { id: "e2-4", source: "2", target: "4", label: "Polishing" },
          { id: "e2-5", source: "2", target: "5", label: "Stagnating" },
          { id: "e3-6", source: "3", target: "6", label: "Hits the mark" },
          { id: "e3-7", source: "3", target: "7", label: "Misses the mark" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-11", source: "7", target: "11" },
          { id: "e8-12", source: "8", target: "12" },
          { id: "e9-13", source: "9", target: "13" },
          { id: "e10-14", source: "10", target: "14" },
          { id: "e11-15", source: "11", target: "15" },
        ],
      },
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "A Crisis Hits", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "React Immediately", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Pause and Strategize", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Put Out Fires Frantically", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Decisive Action Saves the Day", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Map the System First", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Analysis Paralysis", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Fire After Fire After Fire", type: "process" },
          { id: "9", positionX: 100, positionY: 600, label: "Immediate Relief, Root Unaddressed", type: "process" },
          { id: "10", positionX: 500, positionY: 600, label: "Identify the Leverage Point", type: "process" },
          { id: "11", positionX: 900, positionY: 600, label: "Missed the Moment", type: "process" },
          { id: "12", positionX: -100, positionY: 800, label: "Complete Burnout", type: "end" },
          { id: "13", positionX: 300, positionY: 800, label: "Short-Term Victory, Long-Term Risk", type: "end" },
          { id: "14", positionX: 700, positionY: 800, label: "Resilient System Built", type: "end" },
          { id: "15", positionX: 900, positionY: 800, label: "Collapse", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Act fast" },
          { id: "e1-3", source: "1", target: "3", label: "Think first" },
          { id: "e2-4", source: "2", target: "4", label: "Chaos" },
          { id: "e2-5", source: "2", target: "5", label: "Good instinct" },
          { id: "e3-6", source: "3", target: "6", label: "Strategic" },
          { id: "e3-7", source: "3", target: "7", label: "Overthinking" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-11", source: "7", target: "11" },
          { id: "e8-12", source: "8", target: "12" },
          { id: "e9-13", source: "9", target: "13" },
          { id: "e10-14", source: "10", target: "14" },
          { id: "e11-15", source: "11", target: "15" },
        ],
      },
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "You Want to Build a Habit", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Start Small and Consistent", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Go Big and Go Hard", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Tiny Progress Compounds", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Boredom Threatens Consistency", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Massive Early Progress", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Burnout Hits Within Weeks", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Habit Becomes Automatic", type: "process" },
          { id: "9", positionX: 100, positionY: 600, label: "Skip a Day, Then Another", type: "process" },
          { id: "10", positionX: 500, positionY: 600, label: "Streak Builds Identity", type: "process" },
          { id: "11", positionX: 900, positionY: 600, label: "Quit After Two Weeks", type: "process" },
          { id: "12", positionX: -100, positionY: 800, label: "Lifetime Transformation", type: "end" },
          { id: "13", positionX: 300, positionY: 800, label: "Back to Square One", type: "end" },
          { id: "14", positionX: 700, positionY: 800, label: "Identity Change Complete", type: "end" },
          { id: "15", positionX: 900, positionY: 800, label: "Another Failed Resolution", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Small start" },
          { id: "e1-3", source: "1", target: "3", label: "Big start" },
          { id: "e2-4", source: "2", target: "4", label: "Stay consistent" },
          { id: "e2-5", source: "2", target: "5", label: "Get bored" },
          { id: "e3-6", source: "3", target: "6", label: "Early momentum" },
          { id: "e3-7", source: "3", target: "7", label: "Overwhelm" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-11", source: "7", target: "11" },
          { id: "e8-12", source: "8", target: "12" },
          { id: "e9-13", source: "9", target: "13" },
          { id: "e10-12", source: "10", target: "12" },
          { id: "e11-14", source: "11", target: "14" },
        ],
      },
      {
        nodes: [
          { id: "1", positionX: 400, positionY: 0, label: "Data Overload", type: "start" },
          { id: "2", positionX: 100, positionY: 200, label: "Trust Your Gut", type: "process" },
          { id: "3", positionX: 700, positionY: 200, label: "Analyze the Data", type: "process" },
          { id: "4", positionX: -100, positionY: 400, label: "Instinct Leads Right", type: "process" },
          { id: "5", positionX: 100, positionY: 400, label: "Bias Clouds Judgment", type: "process" },
          { id: "6", positionX: 500, positionY: 400, label: "Patterns Emerge From Data", type: "process" },
          { id: "7", positionX: 900, positionY: 400, label: "Analysis Reveals Nothing", type: "process" },
          { id: "8", positionX: -100, positionY: 600, label: "Bold Move Pays Off", type: "process" },
          { id: "9", positionX: 100, positionY: 600, label: "Costly Mistake", type: "process" },
          { id: "10", positionX: 500, positionY: 600, label: "Confidence to Act", type: "process" },
          { id: "11", positionX: 900, positionY: 600, label: "Back to Square One", type: "process" },
          { id: "12", positionX: -100, positionY: 800, label: "Celebrated as Genius", type: "end" },
          { id: "13", positionX: 100, positionY: 800, label: "Learning the Hard Way", type: "end" },
          { id: "14", positionX: 500, positionY: 800, label: "Data-Backed Success", type: "end" },
          { id: "15", positionX: 900, positionY: 800, label: "Still No Clear Answer", type: "end" },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "Intuition" },
          { id: "e1-3", source: "1", target: "3", label: "Logic" },
          { id: "e2-4", source: "2", target: "4", label: "Right call" },
          { id: "e2-5", source: "2", target: "5", label: "Wrong call" },
          { id: "e3-6", source: "3", target: "6", label: "Clarity" },
          { id: "e3-7", source: "3", target: "7", label: "Dead end" },
          { id: "e4-8", source: "4", target: "8" },
          { id: "e5-9", source: "5", target: "9" },
          { id: "e6-10", source: "6", target: "10" },
          { id: "e7-11", source: "7", target: "11" },
          { id: "e8-12", source: "8", target: "12" },
          { id: "e9-13", source: "9", target: "13" },
          { id: "e10-14", source: "10", target: "14" },
          { id: "e11-15", source: "11", target: "15" },
        ],
      },
    ];
    const scenario = scenarios[hash % scenarios.length];
    const layoutSlugs = ensureUniqueSlugs(scenario.nodes.map((n) => ({ label: n.label })));
    const nodes = scenario.nodes.map((n, i) => ({
      ...n,
      type: n.type || "process",
      description: n.label.includes(title) ? `You encounter a situation that tests your understanding of ${title}.` : `${n.label} — a turning point in your ${title} journey.`,
      content: generateNodeContent(n.label, title, i),
      slug: layoutSlugs[i].slug,
    }));
    const edges = scenario.edges.map((e) => ({ ...e }));
    return { nodes, edges };
  }

  function generateQuestions(title: string) {
    const templates = [
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
      {
        question: `How can you tell if you're truly applying "${title}" vs just understanding it intellectually?`,
        options: [
          `You can explain it to someone else`,
          `Your decisions start changing automatically without conscious effort`,
          `You score highly on a test about it`,
          `You can quote the definition from memory`,
        ],
        correctAnswer: 1,
        explanation: `Real understanding isn't what you know — it's what you do differently. If your behavior hasn't changed, you haven't internalized it yet.`,
      },
      {
        question: `What is the counter-intuitive truth about "${title}"?`,
        options: [
          `It's harder than it looks`,
          `The obvious approach is often the wrong one — the real leverage comes from doing the opposite of what feels natural`,
          `Only experts can use it effectively`,
          `It requires special talent`,
        ],
        correctAnswer: 1,
        explanation: `Most mental models are counter-intuitive by nature. The right answer often feels wrong at first because your brain is wired for short-term thinking.`,
      },
      {
        question: `When should you NOT apply "${title}"?`,
        options: [
          `Always apply it, no exceptions`,
          `When the stakes are low and speed matters more than accuracy`,
          `Only on weekends`,
          `When you're feeling confident`,
        ],
        correctAnswer: 1,
        explanation: `No mental model is universal. Knowing when NOT to use a tool is as important as knowing how to use it. Context is everything.`,
      },
      {
        question: `How does "${title}" conflict with common wisdom?`,
        options: [
          `It doesn't — it reinforces what everyone already knows`,
          `It challenges the obvious answer, revealing that conventional thinking often misses the deeper truth`,
          `It's too complex for everyday use`,
          `It only applies in business settings`,
        ],
        correctAnswer: 1,
        explanation: `Great mental models earn their keep by revealing what common sense gets wrong. If it doesn't challenge you, it won't change you.`,
      },
      {
        question: `What's the best way to practice "${title}" in daily life?`,
        options: [
          `Study it for an hour every morning`,
          `Create low-stakes situations where you can apply it and observe the outcome without pressure`,
          `Only use it for major life decisions`,
          `Write about it in a journal but don't change your behavior`,
        ],
        correctAnswer: 1,
        explanation: `Deliberate practice means creating safe spaces to fail. Low-stakes experiments let you build the mental muscle without paying the price of high-stakes mistakes.`,
      },
      {
        question: `What does mastery of "${title}" look like in practice?`,
        options: [
          `You can teach a course on it`,
          `You apply it automatically, without thinking — it becomes part of your mental operating system`,
          `You've read every book about it`,
          `You can win arguments using it`,
        ],
        correctAnswer: 1,
        explanation: `True mastery is invisible. When a mental model is fully integrated, you don't think about using it — you just see the world differently.`,
      },
      {
        question: `What hidden assumption does "${title}" challenge?`,
        options: [
          `It agrees with everything you already believe`,
          `It reveals that your default approach is often backwards — the real insight is counter to instinct`,
          `It only works for geniuses`,
          `It requires expensive tools`,
        ],
        correctAnswer: 1,
        explanation: `The best mental models earn their value by challenging what seems obvious. If it doesn't unsettle you slightly, you probably haven't understood it yet.`,
      },
      {
        question: `How do most people misunderstand "${title}" at first?`,
        options: [
          `They think it's too simple to matter`,
          `They assume it's a technique rather than a shift in perspective — tools can be learned, but seeing differently takes practice`,
          `They believe it's already obsolete`,
          `They think it only applies to work`,
        ],
        correctAnswer: 1,
        explanation: `The most powerful ideas seem obvious in hindsight. The mistake is treating them as tricks rather than fundamental changes in how you perceive the world.`,
      },
      {
        question: `What emotion does "${title}" most often trigger in beginners?`,
        options: [
          `Boredom — it seems familiar`,
          `Resistance — because it asks you to question habits you've relied on for years`,
          `Excitement — immediate results`,
          `Confusion — it's poorly explained`,
        ],
        correctAnswer: 1,
        explanation: `Real learning threatens the comfortable stories we tell ourselves. Resistance is a sign you're touching something that matters. Push through it.`,
      },
      {
        question: `What is a subtle sign you've internalized "${title}"?`,
        options: [
          `You use the terminology correctly`,
          `You notice yourself applying it automatically in situations you wouldn't have connected before`,
          `You've collected many resources about it`,
          `You can spot others who don't understand it`,
        ],
        correctAnswer: 1,
        explanation: `True internalization is invisible to the person experiencing it. You don't think about using the model — you just start seeing the world through its lens naturally.`,
      },
      {
        question: `How does "${title}" apply differently in high-stakes vs low-stakes situations?`,
        options: [
          `It doesn't matter — same application everywhere`,
          `High stakes narrow your thinking; ${title.toLowerCase()} helps you expand it again`,
          `It only works in low-stakes`,
          `Stakes don't affect mental models`,
        ],
        correctAnswer: 1,
        explanation: `Pressure constrains cognition. The real value of a mental model is that it gives you a framework to think clearly when your instinct is to panic.`,
      },
      {
        question: `What is the most common relapse when learning "${title}"?`,
        options: [
          `Losing motivation after initial success`,
          `Reverting to old habits during stress — the model works, but your brain defaults to what's familiar under pressure`,
          `Getting bored with practice`,
          `Running out of resources`,
        ],
        correctAnswer: 1,
        explanation: `Learning is not linear. Expect regression, especially under stress. The key is not to avoid relapse — it's to recognize it faster each time and return to the practice.`,
      },
      {
        question: `What second-order effect does mastering "${title}" create?`,
        options: [
          `People think you're naturally talented`,
          `It changes how you see unrelated areas — the model ripples beyond its original domain`,
          `You become overconfident`,
          `You lose interest in other topics`,
        ],
        correctAnswer: 1,
        explanation: `Deep mastery of one mental model often unlocks insights in unexpected places. The cross-domain connections are where the real leverage lives.`,
      },
      {
        question: `What is the hardest part about teaching "${title}" to someone else?`,
        options: [
          `Finding the right resources`,
          `Letting them discover it themselves instead of giving them the answer — a explained insight is weaker than an earned one`,
          `Keeping their attention`,
          `Testing their understanding`,
        ],
        correctAnswer: 1,
        explanation: `The temptation when teaching is to shortcut the struggle. But struggle is where learning lives. The best teachers create conditions for discovery, not shortcuts.`,
      },
      {
        question: `What does "${title}" reveal about your blind spots?`,
        options: [
          `That you have none`,
          `That the areas where you're most confident are often where your biggest blind spots hide`,
          `That blind spots don't matter`,
          `That only beginners have blind spots`,
        ],
        correctAnswer: 1,
        explanation: `Expertise creates confidence, but confidence often outpaces accuracy. The most dangerous blind spots are the ones you don't know you have — precisely because you think you've mastered the area.`,
      },
      {
        question: `How does "${title}" change your relationship with mistakes?`,
        options: [
          `Mistakes become something to avoid at all costs`,
          `Mistakes become data — each error is a signal about where your model of reality doesn't match actual reality`,
          `Mistakes don't matter`,
          `You stop making mistakes entirely`,
        ],
        correctAnswer: 1,
        explanation: `The shift from avoiding mistakes to learning from them is one of the most transformative changes a mental model can create. Errors are not failures — they're feedback.`,
      },
      {
        question: `What is the relationship between "${title}" and intuition?`,
        options: [
          `They're unrelated`,
          `Over time, ${title.toLowerCase()} becomes intuition — the conscious practice integrates into subconscious default`,
          `Intuition replaces the model entirely`,
          `The model replaces intuition entirely`,
        ],
        correctAnswer: 1,
        explanation: `The goal of any mental model is not to override intuition, but to upgrade it. Conscious practice becomes unconscious competence. That's the arc of mastery.`,
      },
      {
        question: `What context makes "${title}" most powerful?`,
        options: [
          `It works equally well in every situation`,
          `It's most powerful when you're stuck — when all obvious options are exhausted, ${title.toLowerCase()} opens a new dimension of thinking`,
          `Only in academic settings`,
          `Only in competitive environments`,
        ],
        correctAnswer: 1,
        explanation: `Mental models are leverage tools. Their value peaks when conventional approaches have failed. They're the thinking you reach for when thinking itself is the bottleneck.`,
      },
    ];
    const hash = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const t1 = templates[hash % templates.length];
    const t2 = templates[(hash + 7) % templates.length];
    const t3 = templates[(hash + 13) % templates.length];
    const t4 = templates[(hash + 19) % templates.length];
    const selected = [t1, t2, t3, t4];
    const unique = [...new Map(selected.map((t, i) => [t.question, t])).values()];
    return unique.slice(0, 2);
  }

  // Full modules data — scenario-based simulations
  const modulesData = [
    {
      slug: "er-triage-decision",
      title: "Make or Break",
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
      title: "The Fork in the Road",
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
      title: "The Domino Effect",
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
      title: "Stolen Focus",
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
      title: "Where the Hours Go",
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
      title: "Know Your Worth",
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
      title: "Beyond the Blank",
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
      title: "Three Minutes",
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
    { slug: "occams-razor", title: "The Simplicity Rule", description: "The simplest solution is usually the correct one.", category: "logic", content: `Occam's Razor is a principle that suggests when presented with competing hypotheses, the one with the fewest assumptions should be selected.

### The Principle of Parsimony
The simplest explanation is usually the correct one. This doesn't mean the simplest answer is always right, but it should be your starting point.

### How to Apply
When choosing between competing explanations, prefer the one requiring the fewest leaps of logic. Use it as a thinking tool, not an absolute rule.` },
    { slug: "confirmation-bias", title: "The Echo Chamber", description: "The tendency to search for information that confirms your beliefs.", category: "psychology", content: `Confirmation bias is the tendency to search for, interpret, and recall information in a way that confirms your pre-existing beliefs.

### How It Distorts Thinking
You naturally favor evidence that supports your views while dismissing contradictory information. This creates an echo chamber in your mind.

### Breaking the Bias
Actively seek disconfirming evidence. Before making a decision, ask yourself: "What would prove me wrong?"` },
    { slug: "compound-effect", title: "Small Steps, Big Results", description: "Small, smart choices + consistency + time = radical difference.", category: "success", content: `The Compound Effect is the principle of reaping huge rewards from small, consistent actions over time.

### The Math of Small Gains
Improving just 1% every day leads to a 37x improvement over a year. Small choices may seem insignificant in the moment but compound into massive results.

### Consistency Over Intensity
It's not about making huge changes—it's about making small good choices every single day. The magic happens in the mundane.` },
    { slug: "circle-influence", title: "Focus on What Matters", description: "Focus on what you can control, not what you can't.", category: "stoicism", content: `Stephen Covey's Circle of Influence concept teaches us to focus our energy on things we can actually control.

### The Two Circles
The Circle of Concern includes everything you care about. The Circle of Influence is the subset you can actually affect. Wise people focus on the latter.

### Expanding Your Influence
By focusing entirely on what you can influence, you gradually expand that circle. Energy spent on concerns outside your control is wasted energy.` },
    { slug: "dunning-kruger", title: "The Confidence Trap", description: "People with low ability overestimate their skill level.", category: "cognitive-bias", content: `The Dunning-Kruger effect is a cognitive bias where people with low ability at a task overestimate their ability.

### The Confidence Gap
Novices lack the expertise to recognize their own incompetence, so they feel overly confident. Experts, knowing what they don't know, often underestimate themselves.

### Staying Grounded
Keep learning and stay humble. The more you know, the more you realize how much you don't know. True mastery comes with intellectual humility.` },
    { slug: "eisenhower-matrix", title: "The Art of Priority", description: "Prioritize tasks by urgency and importance.", category: "productivity", content: `The Eisenhower Matrix helps you prioritize tasks by categorizing them into four quadrants.

### The Four Quadrants
Urgent & Important: Do immediately. Important & Not Urgent: Schedule. Urgent & Not Important: Delegate. Not Urgent & Not Important: Eliminate.

### Focus on Quadrant II
Most high-performers spend their time in Quadrant II (Important but Not Urgent). This is where planning, relationship building, and personal growth live.` },
    { slug: "growth-mindset", title: "The Power of Yet", description: "Believe your abilities can be developed through dedication.", category: "mindset", content: `A growth mindset is the belief that your basic qualities are things you can cultivate through effort.

### Fixed vs Growth
Fixed mindset believes talent is innate. Growth mindset sees challenges as opportunities. When you fail, a growth mindset says "I can't do it yet."

### Cultivating Growth
Praise effort, not outcomes. Embrace challenges as learning opportunities. Replace "I'm not good at this" with "What am I missing?"` },
    { slug: "imposter-syndrome", title: "The Secret Fear", description: "Feeling like a fraud despite evident success.", category: "psychology", content: `Imposter syndrome is a psychological pattern where one doubts their accomplishments and fears being exposed as a fraud.

### The Imposter Cycle
You achieve success, attribute it to luck, feel anxious about being "found out," work twice as hard, achieve more success—and the cycle repeats.

### Breaking Free
Document your wins objectively. Talk about it openly with peers. Remember that competence isn't about knowing everything—it's about figuring things out.` },
    { slug: "marginal-thinking", title: "One More Step", description: "Decisions based on incremental costs vs. total costs.", category: "decision-making", content: `Marginal thinking focuses on the additional cost or benefit of one more unit, rather than looking at total costs and benefits.

### Think at the Margin
Should you eat one more slice? It doesn't matter how full you are overall—it matters whether the marginal benefit of this slice exceeds the marginal cost.

### Better Decisions
Marginal thinking prevents sunken cost errors. The only question that matters is: "What happens if I take one more step in this direction?"` },
    { slug: "network-effect", title: "The Connection Multiplier", description: "Product becomes more valuable as more people use it.", category: "business", content: `The network effect occurs when a product or service becomes more valuable as more people use it.

### How Networks Grow
Each new user adds value for every existing user. This creates a positive feedback loop that makes dominant platforms extremely hard to displace.

### Building Network Effects
To leverage network effects, focus on user density in a specific market. A network is useless if no one you care about is on it.` },
    { slug: "opportunity-cost", title: "The Hidden Price", description: "The loss of potential gain from other alternatives.", category: "decision-making", content: `Opportunity cost is the loss of potential gain from other alternatives when one alternative is chosen.

### Every Choice Has a Cost
When you say yes to something, you're implicitly saying no to everything else. Time spent scrolling is time not spent learning, building, or connecting.

### Making Conscious Trade-offs
Awareness of opportunity cost helps you make deliberate choices. Before committing, ask: "What am I giving up by choosing this?"` },
    { slug: "parkinsons-law", title: "The Time Trap", description: "Work expands to fill the time available for completion.", category: "productivity", content: `Parkinson's Law states that work expands so as to fill the time available for its completion.

### The Time Trap
Give yourself a week to write an email, and it'll take a week. Give yourself an hour, and it'll take an hour. The complexity of the task adjusts to the deadline.

### Use It to Your Advantage
Set artificial, tight deadlines for everything. Work will naturally compress to fit. This is why sprints and timeboxing are so effective for productivity.` },
    { slug: "rubber-ducky", title: "Talk It Out", description: "Explain your problem to an inanimate object to solve it.", category: "problem-solving", content: `Rubber duck debugging is a method of debugging by explaining the problem to an inanimate object.

### Why It Works
Describing your problem step by step forces you to structure your thoughts clearly. In doing so, you often spot the flaw yourself.

### How to Do It
Get a rubber duck (or any object). Explain your problem out loud as if teaching it. Describe what you expect to happen versus what's actually happening. The answer usually emerges naturally.` },
    { slug: "sunk-cost", title: "Let It Go", description: "Don't let past investments dictate future decisions.", category: "cognitive-bias", content: `The sunk cost fallacy is the tendency to continue an endeavor once an investment of time, money, or effort has been made.

### The Trap of "Already Invested"
"F, I've already spent so much on this degree/course/relationship." The rational question isn't "How much have I invested?" but "What is the best use of my resources from this point forward?"

### Escaping the Trap
Make decisions based on future value, not past costs. Ask yourself: "If I were starting fresh today, would I still choose this?"` },
    { slug: "systems-thinking", title: "The Big Picture", description: "Understand how parts interrelate in a whole system.", category: "mental-model", content: `Systems thinking is a holistic approach to analysis that focuses on how parts interrelate within a whole.

### Beyond Linear Thinking
Problems rarely have single causes. Systems thinking reveals feedback loops, delays, and unintended consequences that linear thinking misses.

### Practical Application
Map out all the elements in a problem and draw arrows showing how they influence each other. Look for reinforcing loops (growth) and balancing loops (stability).` },
    { slug: "two-system", title: "Fast Mind, Slow Mind", description: "Fast, intuitive vs. slow, deliberate thinking.", category: "psychology", content: `Two Systems Theory describes System 1 (fast, intuitive) and System 2 (slow, deliberate) thinking.

### System 1: The Autopilot
System 1 operates automatically and quickly—recognizing faces, reading emotions, making snap judgments. It's efficient but error-prone.

### System 2: The Pilot
System 2 allocates attention to effortful mental activities—complex calculations, logical reasoning. It's accurate but slow and lazy. Most errors happen when System 1 runs unchecked.` },
    { slug: "zero-sum", title: "Win-Lose Thinking", description: "One person's gain is another's loss.", category: "game-theory", content: `A zero-sum game is where one participant's gain is exactly balanced by another's loss.

### Fixed Pie Thinking
Many situations look like zero-sum but aren't. Believing life is zero-sum leads to hyper-competition, scarcity mindset, and missed opportunities for collaboration.

### Creating Win-Win
In business and life, you can often expand the pie rather than fighting over slices. Look for opportunities where both sides can benefit.` },
    { slug: "antifragile", title: "Stronger Through Chaos", description: "Systems that improve with disorder and stress.", category: "resilience", content: `Antifragile describes things that gain from disorder, volatility, and stress—going beyond resilience.

### Fragile vs Robust vs Antifragile
Fragile breaks under stress. Robust resists stress. Antifragile gets stronger. The immune system is antifragile—exposure to germs makes it stronger.

### Building Antifragility
Expose yourself to manageable doses of stress. Create systems that benefit from volatility. Have optionality—multiple paths to success so chaos works in your favor.` },
    { slug: "baader-meinhof", title: "Once You See It", description: "Learning something new makes you see it everywhere.", category: "psychology", content: `The Baader-Meinhof phenomenon is when you learn something new and then suddenly see it everywhere.

### Frequency Illusion
This combines two biases: selective attention (you notice what's on your mind) and confirmation bias (you look for evidence you're right). The thing didn't become more common—you just became more aware.

### Leveraging the Effect
Learn a new concept deeply, and you'll start seeing it everywhere. This is how mental models compound—each new model helps you recognize patterns you previously missed.` },
    { slug: "black-swan", title: "When the Unthinkable Happens", description: "Rare, unpredictable events with massive impact.", category: "risk", content: `A Black Swan event is an unpredictable event that has massive consequences and is often rationalized in hindsight.

### The Black Swan Triad
Rarity: It's an outlier. Extreme Impact: It changes everything. Retrospective Predictability: Everyone claims they "knew it all along" after the fact.

### Navigating Black Swans
Build robustness to negative Black Swans (don't risk what you can't afford to lose). Position yourself to benefit from positive Black Swans (say yes to optionality).` },
    { slug: "diminishing-returns", title: "The Point of Less", description: "After a point, each additional unit yields less benefit.", category: "economics", content: `The law of diminishing returns states that adding more of one factor will at some point yield proportionally lower output.

### The Optimization Problem
The first hour of study is highly productive. The tenth hour? Much less so. This law applies everywhere—work, exercise, relationships, even happiness.

### Finding the Sweet Spot
Stop before the marginal benefit drops below the marginal cost. More isn't always better. The optimal point is where one more unit gives equal benefit and cost.` },
    { slug: "goodharts-law", title: "The Measure Trap", description: "When a measure becomes a target, it ceases to be useful.", category: "economics", content: `Goodhart's Law states that when a measure becomes a target, it ceases to be a good measure.

### The Perverse Incentive
When you optimize a metric, people will game it. Test scores become less about learning and more about test-taking. Lines of code become a target, and suddenly you get bloated software.

### Choosing Metrics Wisely
Use multiple metrics. Change them periodically. Never make any single metric a target. Better yet, measure outcomes not outputs.` },
    { slug: "hanlons-razor", title: "Assume Less", description: "Never attribute to malice what can be explained by stupidity.", category: "logic", content: `Hanlon's Razor suggests we should not attribute to malice what can be adequately explained by ignorance, incompetence, or oversight.

### Why We Assume Malice
It's ego-protecting. If someone is against us, their opposition validates our importance. But most people aren't plotting against you—they're just busy with their own lives.

### Applying the Razor
Before getting angry at someone's actions, ask: "Could this be explained by them making a mistake, being tired, or not knowing better?" You'll save yourself a lot of unnecessary conflict.` },
    { slug: "survivorship-bias", title: "The Invisible Failures", description: "Focusing on successes while ignoring failures.", category: "cognitive-bias", content: `Survivorship bias is concentrating on survivors or successes while overlooking those that didn't make it.

### The Invisible Graveyard
We see successful startups and think "anyone can do it." We forget the thousands that failed. We see wealthy dropouts and think "school doesn't matter." We ignore the poor dropouts.

### Correcting for Bias
Ask: "What am I not seeing?" Look at the full dataset, not just the winners. Study failures as closely as successes. The graveyard of the invisible tells the real story.` },
    { slug: "mindfulness-basics", title: "The Art of Presence", description: "Training your brain to be present and focused.", category: "wellbeing", content: `Mindfulness is the practice of paying attention to the present moment without judgment.

### The Default Mode Network
Your brain has a "default mode" that runs on autopilot—worrying about the past, planning the future. Mindfulness trains you to notice when you've left the present and gently return.

### Starting Small
Sit for two minutes. Focus on your breath. When your mind wanders (and it will), gently bring it back. That's it. Do this daily and watch your focus and calm improve.` },
    { slug: "cognitive-restructuring", title: "Rewrite Your Thoughts", description: "Changing negative thought patterns to improve mental health.", category: "wellbeing", content: `Cognitive restructuring involves identifying and challenging irrational or negative thought patterns to improve mental health.

### Common Cognitive Distortions
All-or-nothing thinking, catastrophizing, mind reading, emotional reasoning—these patterns feel true but are rarely accurate reflections of reality.

### The ABCDE Method
Activating event → Belief → Consequence → Dispute → Effect. Catch the automatic thought, question its validity, and replace it with a balanced perspective.` },
    { slug: "deliberate-practice", title: "The Science of Mastery", description: "The science of becoming an expert at anything.", category: "focus", content: `Deliberate practice is structured skill improvement with focused, repetitive practice and immediate feedback.

### Beyond Naive Practice
Naive practice is just doing the thing. Deliberate practice is purposeful—identifying specific weaknesses, pushing beyond your comfort zone, and getting instant feedback.

### The 4 Components
1. Specific goal. 2. Full attention. 3. Immediate feedback. 4. Stretch just beyond current ability. Without these four, you're just going through the motions.` },
    { slug: "monk-mode", title: "Radical Focus", description: "Radical focus by eliminating all distractions for a set period.", category: "focus", content: `Monk mode is an extreme productivity strategy where you eliminate all non-essential activities for a set period to achieve radical focus.

### What You Cut
Social media, news, dating, events, entertainment, multitasking. You strip life down to: meaningful work, exercise, sleep, and basic maintenance.

### How Long?
Try 30 days. During monk mode, you'll be bored—which is the point. Boredom forces you to face your work and your thoughts without escape. Deep work becomes inevitable.` },
    { slug: "divergent-thinking", title: "Branching Out", description: "Generating creative ideas by exploring many possible solutions.", category: "creativity", content: `Divergent thinking explores many possible solutions to generate creative ideas. Convergent thinking narrows them down.

### Quantity Breeds Quality
The best ideas usually emerge after you've exhausted the obvious ones. Generate first, judge later. Shoot for dozens of ideas before evaluating any of them.

### Techniques to Try
Brainstorming, mind mapping, free writing, SCAMPER (Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse). Each forces your brain down new paths.` },
    { slug: "lateral-thinking", title: "Think Sideways", description: "Solving problems through an indirect and creative approach.", category: "creativity", content: `Lateral thinking solves problems using an indirect and creative approach rather than traditional step-by-step logic.

### Breaking Patterns
Lateral thinking challenges assumptions. Instead of asking "How do I make my product better?" ask "How could I make it obsolete?" The reframe often reveals unexpected solutions.

### Provocative Operation
Use "po" statements to jolt your thinking. "Po: cars should have square wheels." This absurd idea forces you to think about what wheels really do and might lead to novel solutions.` },
    { slug: "learning-how-to-learn", title: "The Meta Skill", description: "Meta-learning strategies to accelerate your skill acquisition.", category: "learning", content: `Learning how to learn is the ultimate meta-skill. It's the art of understanding how your brain acquires and retains knowledge.

### The Two Learning Modes
Focused mode: intense concentration on a specific problem. Diffuse mode: relaxed, allowing the brain to make connections across ideas. You need both.

### Key Strategies
Spaced repetition, active recall, interleaving, and the Feynman Technique (teach it to a child). These are scientifically proven to dramatically improve retention and understanding.` },
    { slug: "spaced-repetition", title: "Remember for Life", description: "Optimizing memory retention through strategic review intervals.", category: "learning", content: `Spaced repetition involves reviewing information at increasing intervals over time to optimize memory retention.

### The Forgetting Curve
Ebbinghaus discovered that we forget exponentially. Within hours, we lose 50% of what we learned. Spaced repetition interrupts this curve at strategic points.

### Practical Implementation
Review new material after 1 day, then 3, then 7, then 14, then 30 days. Use tools like Anki or a simple spreadsheet. The key is to review just before you would have forgotten.` },
    { slug: "decision-matrix", title: "Choose with Clarity", description: "A framework for making rational choices under uncertainty.", category: "clarity", content: `A decision matrix helps you evaluate options by scoring them against weighted criteria.

### How to Build One
List your options as rows. List your criteria as columns. Weight each criterion by importance. Score each option per criterion. Multiply score by weight and sum.

### Reducing Bias
The matrix forces explicit trade-offs. You can't just say "I feel like Option A is better." You have to justify each score. This exposes hidden assumptions and emotional reasoning.` },
    { slug: "inversion-thinking", title: "Think Backward", description: "Solving problems backward by considering the opposite.", category: "clarity", content: `Inversion involves looking at a problem from the opposite direction to gain new insights.

### Ask the Negative
Instead of "How do I achieve success?" ask "What would guarantee failure?" Then avoid those things. Instead of "How do I build a great product?" ask "What would make a product terrible?"

### The Power of Inverse
Inversion reveals blind spots. The things that cause failure often aren't the opposite of success factors—they're completely different variables. By studying failure, you protect against it.` },
    { slug: "habit-stacking", title: "The Habit Chain", description: "Building new habits by linking them to existing routines.", category: "habit", content: `Habit stacking pairs a new habit with an existing one, using the existing routine as a trigger.

### The Formula
After [existing habit], I will [new habit]. After I pour my morning coffee, I will meditate for 60 seconds. After I brush my teeth, I will floss one tooth.

### Why It Works
The existing habit serves as a built-in reminder and the neural pathway is already established. You're not creating a new routine from scratch—you're piggybacking on an existing one.` },
    { slug: "identity-based-habits", title: "Becoming Before Doing", description: "Lasting behavior change by shifting your self-identity.", category: "habit", content: `Focus on who you want to become, not what you want to achieve. Identity-based habits create lasting change.

### The Three Layers
Outcomes: what you get. Processes: what you do. Identity: what you believe. Most people focus on outcomes. Lasting change starts with identity.

### Shifting Your Identity
Instead of "I'm trying to quit sugar," say "I'm not a sugar-eater." Instead of "I want to read more," say "I'm a reader." Each small action reinforces the new identity.` },
    { slug: "first-principles-problem", title: "Back to Basics", description: "Breaking down complex problems into basic elements.", category: "problem-solving", content: `First principles thinking breaks down problems into fundamental truths and rebuilds solutions from there.

### Socratic Questioning
Start with your assumption and question it relentlessly. "Is it really true? What evidence do I have? What if I removed this assumption?"

### Elon's Rocket Example
In the 2000s, rockets were "expensive." But first principles showed the raw materials were only 2% of the price. The rest was manufacturing inefficiency. SpaceX built rockets for a fraction of the cost.` },
    { slug: "blue-ocean", title: "Create Your Own Game", description: "Creating uncontested market space instead of competing.", category: "strategy", content: `Blue Ocean Strategy creates new market space rather than competing in existing, crowded markets.

### Red vs Blue Oceans
Red oceans are known markets with fierce competition. Blue oceans are unknown markets where demand is created, not fought over.

### Creating Your Blue Ocean
Look across alternative industries, strategic groups, buyer groups, complementary offerings. Ask: "What can I eliminate, reduce, raise, and create that no one else is doing?"` },
    { slug: "stoic-morning", title: "Dawn of Resilience", description: "Starting your day with ancient wisdom for modern resilience.", category: "stoicism", content: `A Stoic morning involves waking early and reflecting on what you can control before the world imposes its agenda on you.

### The Premeditatio Malorum
Spend a few minutes visualizing the worst that could happen today. Not to be pessimistic, but to prepare. If someone insults you, how will you respond? If a project fails, what then?

### Morning Reflection
Ask: "What do I have that I take for granted? What would I miss if it were gone?" This shifts your brain from wanting to appreciating, from lack to abundance.` },
    { slug: "memento-mori", title: "Remember You Will Die", description: "Remembering your mortality to live a more meaningful life.", category: "stoicism", content: `Memento Mori is the practice of reflecting on one's own mortality to live a more focused and meaningful life.

### Death as a Teacher
Knowing you will die isn't morbid—it's clarifying. It strips away trivial concerns. "Am I really spending my limited time arguing about this?" becomes a powerful filter.

### Daily Practice
Keep a small symbol—a candle, a skull, a wilting flower. When you see it, pause and ask: "If today were my last day, would I want to be doing what I'm about to do?"` },
    { slug: "winner-effect", title: "Success Breeds Success", description: "How winning changes your brain chemistry for future success.", category: "success", content: `The winner effect is a phenomenon where winning increases the likelihood of winning future competitions by changing brain chemistry.

### The Neuroscience
Winning increases testosterone and dopamine levels, which boost confidence, focus, and risk-taking ability. This creates a virtuous cycle: win → chemical boost → perform better → win again.

### Building Momentum
Start with small, achievable wins. Each small victory primes your brain for bigger ones. This is why streak-tracking works—each checked day builds momentum.` },
    { slug: "ikigai", title: "Your Reason to Rise", description: "Finding your reason for being, Japanese philosophy style.", category: "success", content: `Ikigai is the Japanese concept of "reason for being"—the intersection of what you love, what you're good at, what the world needs, and what you can be paid for.

### The Four Circles
Your passion (what you love). Your mission (what the world needs). Your vocation (what you can be paid for). Your profession (what you're good at). Ikigai is the center where all four overlap.

### Finding Your Ikigai
Don't expect to find it overnight. Ikigai is discovered through action, not contemplation. Try things, reflect, and adjust. The answer emerges through living.` },
    { slug: "triz", title: "The Inventor's Toolkit", description: "Systematic problem-solving based on patterns of invention.", category: "problem-solving", content: `TRIZ is a problem-solving methodology based on patterns of invention discovered by analyzing thousands of patents.

### The Core Insight
Most problems have been solved before—just in different contexts. TRIZ provides a systematic way to find existing solutions and apply them to your problem.

### The 40 Principles
TRIZ identified 40 inventive principles (segmentation, asymmetry, nesting, etc.). When stuck, go through the list and ask "Can I apply this principle to my problem?" The solution often jumps out.` },
    { slug: "priming-effect", title: "The Hidden Cue", description: "How subtle cues unconsciously influence your behavior.", category: "psychology", content: `The priming effect occurs when exposure to one stimulus influences your response to another stimulus without conscious awareness.

### How Priming Works
If you read words related to "old" (wrinkle, gray, bingo), you'll walk slower leaving the room. If your phone buzzes, you'll feel the phantom buzz minutes later. Your brain is constantly being primed.

### Designing Your Environment
Priming works both ways. Curate your environment to prime desired behaviors. A book on your desk primes reading. A guitar on a stand primes playing. Out of sight truly is out of mind.` },
    { slug: "halo-effect", title: "First Impressions", description: "How one positive trait influences perception of everything else.", category: "psychology", content: `The halo effect is a cognitive bias where your overall impression of a person influences how you feel about their specific traits.

### The Attractive Halo
We assume attractive people are smarter, kinder, and more competent. We assume successful people's opinions are correct in unrelated domains. Steve Jobs was brilliant at tech, but did that make him an expert in medicine?

### Separating Signal from Noise
Evaluate each trait independently. Judge the idea on its merits, not the person presenting it. Ask: "Would I think this was a good idea if someone I disliked proposed it?"` },
    { slug: "prisoners-dilemma", title: "Trust or Defect", description: "Why cooperation is hard even when it benefits everyone.", category: "game-theory", content: `The prisoner's dilemma shows why rational individuals might not cooperate even when cooperation benefits everyone.

### The Setup
Two prisoners are interrogated separately. If both stay silent, both get 1 year. If one confesses and the other stays silent, the confessor goes free and the other gets 10 years. If both confess, both get 5 years. Rational self-interest leads both to confess, even though silence is better for both.

### Real World Applications
Price wars, arms races, climate change—all are iterated prisoner's dilemmas. The solution is repeated interaction, reputation, and enforcing consequences for defection.` },
    { slug: "post-traumatic-growth", title: "Rising Strong", description: "How adversity can lead to profound personal development.", category: "resilience", content: `Post-traumatic growth refers to positive psychological change experienced as a result of struggling with highly challenging life circumstances.

### The Five Domains
1. Greater appreciation of life. 2. Deeper relationships. 3. Increased personal strength. 4. New possibilities in life. 5. Spiritual or existential development.

### The Growth Through Struggle
You don't grow because of the trauma, but because of how you respond to it. Growth comes from meaning-making—finding purpose in pain and rebuilding a stronger self.` },
    { slug: "risk-reward", title: "Smart Bets Only", description: "Calculating whether a bet is worth taking.", category: "risk", content: `The risk-reward ratio measures the potential loss versus the potential gain of an investment or decision.

### Asymmetric Bets
The best decisions have asymmetric payoffs: limited downside, unlimited upside. Writing a book costs time but could change your entire career. Starting a business risks capital but could create generational wealth.

### Calculating Expected Value
Risk × Probability of loss vs. Reward × Probability of gain. Take bets with positive expected value, especially when you can afford to lose and have many opportunities.` },
    { slug: "network-effects-business", title: "The Growth Multiplier", description: "How platforms become more valuable as more people use them.", category: "business", content: `Network effects occur when a product becomes more valuable as more people use it, creating powerful competitive advantages.

### Types of Network Effects
Direct: Facebook—more friends, more value. Two-sided: Uber—more drivers attract more riders. Data: Waze—more users provide better traffic data. Tech: Microsoft Office—more users means more file compatibility.

### Winning with Networks
Get dense in a small market first. Every new user should noticeably increase value for existing users. Speed matters—whoever reaches critical mass first often wins.` },
    { slug: "moats", title: "The Unbreakable Advantage", description: "Sustainable competitive advantages that protect a business.", category: "business", content: `An economic moat refers to a business's ability to maintain competitive advantages over its rivals to protect its market share and profitability.

### The Five Moats
1. Brand strength (Apple, Coca-Cola). 2. Switching costs (Adobe Creative Cloud). 3. Network effects (Facebook, Uber). 4. Cost advantages (Walmart, Amazon). 5. Intangible assets (patents, licenses).

### Building Your Personal Moat
The same principles apply to your career. Build switching costs (deep relationships), network effects (your reputation), unique skills (your brand), and compounding knowledge.` },
    { slug: "decoupling", title: "Separate Luck from Skill", description: "Separating the decision from the outcome to think clearly.", category: "decision-making", content: `Decoupling separates the quality of a decision from its outcome to prevent outcome bias.

### The Poker Analogy
A good poker player can make the right decision (fold a bad hand) and still lose if the opponent gets lucky. A bad decision (bluff with nothing) can win if the opponent folds. Outcome ≠ Decision Quality.

### How to Decouple
Evaluate decisions based on the information available at the time, not the outcome. Before you know the result, write down why you're choosing this. Later, review the reasoning, not the result.` },
    { slug: "ladder-inference", title: "The Mental Shortcut", description: "How your brain jumps from data to conclusions automatically.", category: "mental-model", content: `The ladder of inference describes the mental steps we take from observing data to taking action, often unconsciously.

### The Rungs
1. Raw data (what happened). 2. Selected data (what I notice). 3. Added meaning (my interpretation). 4. Assumptions (what I infer). 5. Conclusions (what I believe). 6. Beliefs (what I adopt). 7. Actions (what I do).

### Climbing Down
To avoid flawed conclusions, share your reasoning with others. Ask: "What data am I selecting? What assumptions am I making?" Others will see the rungs you missed.` },
    { slug: "burdens-proof", title: "Who Must Prove It", description: "Understanding who is responsible for proving a claim.", category: "logic", content: `The burden of proof is the obligation to provide sufficient evidence for a claim. The person making the claim bears this burden.

### Extraordinary Claims Require Extraordinary Evidence
"Gravity exists" requires minimal proof because it's well-established. "I was abducted by aliens" requires much stronger evidence. The more a claim contradicts established knowledge, the heavier the burden.

### Shifting the Burden
Watch for arguments that shift the burden: "You can't prove God doesn't exist, therefore He does." The one making the positive claim must provide evidence. Skepticism is the default position.` },
    { slug: "emotional-regulation", title: "Calm Under Pressure", description: "Managing your emotions for better decision-making.", category: "wellbeing", content: `Emotional regulation is the ability to manage your emotional state, especially during high-stakes or stressful situations.

### The 90-Second Rule
Neuroscientist Jill Bolte Taylor discovered that the chemical lifespan of an emotion is 90 seconds. Any emotional response lasting longer than that is because you're choosing to re-stimulate it with your thoughts.

### Techniques
Name the emotion: "I notice I'm feeling angry." This activates the prefrontal cortex and calms the amygdala. Breathe deeply for 90 seconds. Let the wave pass before responding.` },
    { slug: "kaizen", title: "The 1% Way", description: "Continuous improvement through small daily changes.", category: "success", content: `Kaizen is the Japanese philosophy of continuous improvement through small, incremental changes.

### The One-Minute Principle
Ask yourself: "What can I improve for one minute?" One minute of exercise. One minute of organizing. One minute of meditating. Small enough to avoid resistance, consistent enough to compound.

### Why Kaizen Works
Large changes trigger fear and resistance. Tiny improvements fly under your brain's radar. Over time, these small gains accumulate into transformations that feel almost effortless.` },
    { slug: "amor-fati", title: "Love Your Fate", description: "Loving everything that happens, including adversity.", category: "stoicism", content: `Amor Fati is the Stoic concept of "love of fate"—embracing everything that happens as necessary for your growth.

### Not Just Acceptance
Stoics don't just tolerate hardship—they love it. Every obstacle is an opportunity. Every failure is a lesson. Every enemy is a teacher. Not "this is fine" but "this is exactly what I needed."

### Living Amor Fati
When something "bad" happens, pause and ask: "How is this making me stronger? What is this teaching me? How will I be better because of this?" Over time, this reframe becomes automatic.` },
    { slug: "five-whys", title: "Ask Why Five Times", description: "Getting to the root cause by asking why five times.", category: "problem-solving", content: `The Five Whys is a root cause analysis technique that involves asking "why" repeatedly until you reach the fundamental cause of a problem.

### The Process
Start with the problem. Ask why it happened. Get an answer. Ask why that answer is true. Repeat. Usually within five iterations, you reach the root cause rather than a symptom.

### Example
"The project was late." Why? "The team started late." Why? "Requirements weren't clear." Why? "No stakeholder alignment meeting." Why? "We didn't schedule one." Root cause: No process for cross-team alignment before projects.` },
    { slug: "active-recall", title: "Test to Remember", description: "Testing yourself to dramatically improve retention.", category: "learning", content: `Active recall is retrieving information from memory rather than passively reviewing it. It's one of the most effective learning techniques known.

### The Testing Effect
Reading notes creates fluency (the feeling of knowing) but not retention. Closing the book and trying to remember forces your brain to strengthen the neural pathways. A single active recall session beats five passive reviews.

### How to Practice
Read a section. Close the book. Write down everything you remember. Check what you missed. Repeat. Use flashcards with questions, not statements. The effort of retrieval is what locks in learning.` },
    { slug: "implementation-intention", title: "When-Then Power", description: "Using if-then plans to lock in new habits.", category: "habit", content: `Implementation intentions are if-then plans that automate decision-making and dramatically increase follow-through.

### The Formula
"If [situation], then I will [action]." If it's 7 AM, then I will go for a run. If I finish lunch, then I will write 200 words. The trigger is specific and the action is clear.

### Why They Work
Implementation intentions offload the decision-making process. You don't need to "decide" to run at 7 AM—you already decided when you wrote the plan. This bypasses procrastination and motivation dips.` },
    { slug: "chicken-game", title: "Who Blinks First", description: "The high-stakes game of mutual escalation.", category: "game-theory", content: `The chicken game models conflict where two parties engage in risky escalation to force the other to back down first.

### The Dynamics
Two drivers race toward each other. The one who swerves first is "chicken." If neither swerves, both crash. Each player hopes the other values survival more than pride.

### Real-World Application
Nuclear brinkmanship, price wars, labor negotiations. The best strategy is often to make it impossible for you to swerve (credible commitment) while giving the other side a dignified way to yield.` },
    { slug: "hyperfocus", title: "The Deep End", description: "Harnessing attention for deep productivity.", category: "focus", content: `Hyperfocus is intense concentration where time disappears and productivity soars.

### The Hyperfocus Cycle
Select a single task. Eliminate all distractions. Set a timer. Work until the timer ends or you hit a natural break point. The key is one task—not switching, not checking, just doing.

### Managing Distraction
Distractions aren't just phone notifications. They're open browser tabs, thoughts about other projects, background noise. Before hyperfocusing, do a "brain dump" of everything on your mind to clear mental RAM.` },
    { slug: "brainwriting", title: "Quiet Genius", description: "Generating ideas in silence before group discussion.", category: "creativity", content: `Brainwriting is generating ideas independently in silence before sharing with the group, avoiding the pitfalls of traditional brainstorming.

### The Process
Everyone writes 3 ideas in 5 minutes in silence. Pass your paper to the right. Read what you received and add 3 new ideas or build on existing ones. Repeat for 3 rounds. Then discuss.

### Why It's Better
Traditional brainstorming lets loud voices dominate. Brainwriting captures everyone's ideas without social pressure. The written format also prevents "idea killing" during the generative phase. Build first, judge later.` },
    { slug: "anchoring-bias", title: "The First Number Wins", description: "How first impressions distort your judgment.", category: "cognitive-bias", content: `Anchoring bias is relying too heavily on the first piece of information you receive when making decisions.

### The Power of the First Number
If a car is priced at $50,000, a $45,000 offer feels reasonable—even if the car is worth $35,000. The initial price "anchors" your perception of value. Real estate agents, negotiators, and salespeople use this constantly.

### Breaking the Anchor
Before hearing any price or number, decide your own reference point. Do independent research. Consider the opposite extreme. "What if this were priced 50% lower—would I still want it?"` },
    { slug: "second-order-thinking", title: "Think Twice", description: "Thinking about the consequences of consequences.", category: "clarity", content: `Second-order thinking considers the downstream effects of decisions rather than just the immediate results.

### First vs Second Order
First order: Build a wall to keep people out. Second order: It also keeps people in. First order: Cut costs by laying off staff. Second order: Remaining staff gets overworked and leaves. First order: Take a painkiller. Second order: The underlying issue never heals.

### Practicing It
For any decision, ask: "And then what?" Repeat five times. Consider unintended consequences. The best decisions are ones where first-order and second-order effects are both positive.` },
    { slug: "flywheel-effect", title: "The Momentum Engine", description: "How small efforts compound into massive momentum.", category: "business", content: `The flywheel effect describes how small efforts, consistently applied, build momentum over time until growth becomes self-sustaining.

### The Flywheel Concept
A flywheel is a heavy wheel that takes enormous effort to start spinning. But with consistent pushes in the same direction, it builds momentum. Eventually, each push has a multiplying effect.

### Your Business Flywheel
Better product → More customers → More revenue → Better product. Identify your loop. Each turn of the flywheel should get slightly easier. Don't stop pushing—the moment you do, friction slows it down.` },
    { slug: "mental-simulation", title: "Rehearse Success", description: "Running scenarios in your head to prepare for reality.", category: "mental-model", content: `Mental simulation involves running through scenarios in your mind to anticipate outcomes and prepare responses.

### Pre-mortems and Pre-parades
Before a project, simulate it failing. What went wrong? What did you miss? Then simulate it succeeding wildly. What made the difference? Both perspectives reveal blind spots.

### Applications
Athletes visualize performances. CEOs simulate board meetings. Surgeons rehearse procedures mentally. The brain activates similar neural patterns during mental rehearsal as during actual execution. You're literally practicing in your mind.` },
    { slug: "straw-man", title: "The Easy Target", description: "Misrepresenting an argument to make it easier to attack.", category: "logic", content: `The straw man fallacy involves distorting an opponent's argument to make it weaker and easier to refute.

### How It Works
Person A: "We should invest more in education." Person B: "So you think money grows on trees and we should bankrupt the country for schools?" B has created a straw man—a distorted version of A's position that's easy to attack.

### Defending Against It
Restate your opponent's position before responding: "Let me make sure I understand you correctly. You're saying..." If they've misrepresented you, calmly point out: "That's not what I said. What I said was..."` },
    { slug: "gtd-method", title: "The Trusted System", description: "Getting things done through systematic organization.", category: "productivity", content: `Getting Things Done (GTD) is based on the principle that your mind is for having ideas, not holding them.

### The Five Steps
1. Capture: Write everything down. 2. Clarify: Decide what's actionable. 3. Organize: Put tasks in appropriate lists. 4. Reflect: Review regularly. 5. Engage: Do the work.

### The Key Insight
Your brain is terrible at storage but great at processing. By moving all task management to an external system, you free mental RAM for actual thinking. If it's in your head, it's not organized. Write it down immediately.` },
    { slug: "tragedy-commons", title: "The Shared Resource Trap", description: "How shared resources get depleted when everyone acts in self-interest.", category: "game-theory", content: `The tragedy of the commons describes depletion of shared resources when individuals act in their own self-interest.

### The Classic Example
Villagers share a common pasture. Each villager adds one more cow, thinking "one more cow won't hurt." But everyone thinks this, and the pasture is destroyed. Individual rationality leads to collective ruin.

### Solutions
Privatization: assign ownership. Regulation: set rules for use. Social norms: build community accountability. The key is aligning individual incentives with the collective good.` },
    { slug: "grey-swan", title: "The Predictable Surprise", description: "Predictable yet ignored high-impact events.", category: "risk", content: `A grey swan is a potentially significant event whose possibility can be predicted but is often ignored.

### Grey vs Black Swans
Black swans are unpredictable. Grey swans are foreseeable but ignored—like a pandemic, a housing bubble, or political upheaval. The warning signs were there, but no one acted.

### Staying Prepared
Pay attention to tail risks. Ask: "What's the worst plausible scenario? What would I do if it happened?" Build buffers: cash reserves, redundant systems, optionality. Being prepared for grey swans gives you an enormous advantage.` },
    { slug: "emotional-immunity", title: "The Resilient Shield", description: "Building psychological resilience against daily stressors.", category: "resilience", content: `Emotional immunity is building mental defenses against daily stressors so they don't derail your focus and well-being.

### The Stress Inoculation
Just like physical immunity, emotional immunity is built through controlled exposure to manageable doses of stress. Each challenge you overcome strengthens your ability to handle the next one.

### Daily Practices
Morning journaling to "drain the emotional cup." Gratitude practice to counter negativity bias. Setting emotional boundaries ("I won't check email after 8 PM"). Creating space between stimulus and response. This is where your power lives.` },
    { slug: "fixed-vs-growth", title: "Your Belief, Your Limit", description: "How your beliefs about intelligence shape your potential.", category: "mindset", content: `Carol Dweck's research shows how your beliefs about your abilities shape your potential more than the abilities themselves.

### The Two Mindsets
Fixed mindset: Intelligence is static, so effort is pointless (you're either good at it or you're not). Growth mindset: Intelligence can be developed, so effort is how you grow. This one belief creates vastly different behaviors.

### The Power of "Yet"
"I can't do this" becomes "I can't do this yet." The word "yet" creates space for growth. It transforms failure from a verdict into data. Every master was once a beginner who refused to stop trying.` },
    { slug: "signaling-theory", title: "Actions Speak Louder", description: "How costly signals convey hidden qualities and shape strategic interactions.", category: "game-theory", content: `Signaling theory explains how one party credibly conveys information about themselves to another party when there is asymmetric information.
 
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

  // Insert all modules — one unified loop
  const seedModules = [...modulesData, ...stubModules];
  for (const mod of seedModules) {
    let nodes, edges, questions;
    const hasInlineData = 'nodes' in mod;
    if (hasInlineData) {
      // Hand-crafted data (from modulesData)
      const rawNodes = makeNodes(mod.slug, mod.nodes);
      const nodeSlugs = ensureUniqueSlugs(rawNodes.map((n) => ({ label: n.label })));
      nodes = rawNodes.map((n, i) => ({
        ...n,
        description: n.description || nodeDescription(n.label),
        content: n.content || generateNodeContent(n.label, mod.title, i),
        slug: nodeSlugs[i].slug,
      }));
      edges = makeEdges(mod.slug, mod.edges);
      questions = mod.questions;
    } else {
      // Auto-generated from templates (from stubModules)
      const graph = generateScenario(mod.title);
      nodes = makeNodes(mod.slug, graph.nodes);
      edges = makeEdges(mod.slug, graph.edges);
      questions = generateQuestions(mod.title);
    }
    // Build rich first node: narrative intro + manual content + generated content
    if (nodes.length > 0) {
      const paragraphs = [];
      // For hand-crafted modules: use mod.content as the hook (no generated intro)
      // For generated modules: use category-based real-life hook
      if (hasInlineData) {
        if (mod.content) {
          const manualParagraphs = mod.content
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('###'));
          paragraphs.push(...manualParagraphs);
        }
        if (nodes[0].content) {
          paragraphs.push(...nodes[0].content);
        }
        if (paragraphs.length > 0) {
          nodes[0].content = paragraphs;
        }
      } else {
        const narrativeIntro = generateNarrativeIntro(mod.title, mod.category);
        if (mod.content) {
          const manualParagraphs = mod.content
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('###'));
          paragraphs.push(...manualParagraphs);
        }
        if (nodes[0].content) {
          paragraphs.push(...nodes[0].content);
        }
        if (paragraphs.length > 0) {
          nodes[0].content = [narrativeIntro, ...paragraphs];
        }
      }
    }
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
          create: nodes.map((n) => ({
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
          create: edges.map((e) => ({
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
    console.log(`  Created module: ${created.slug}${hasInlineData ? ' (hand-crafted)' : ''}`);
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
        userId: adminUser.id,
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
    where: { id: adminUser.id },
    data: { streakCount: 3, lastActiveDate: yesterday },
  });

  console.log(`Progress seeded for ${progressMods.length} modules`);
  console.log(`Total modules created: ${seedModules.length}`);
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
