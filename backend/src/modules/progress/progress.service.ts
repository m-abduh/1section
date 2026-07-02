import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import type { UpdateProgressInput } from "./progress.schema";

export namespace ProgressService {
  export async function getAll(userId: string) {
    const allProgress = await prisma.userProgress.findMany({
      where: { userId, module: { isDraft: false } },
      orderBy: { lastReadAt: "desc" },
      include: {
        module: {
          include: {
            _count: { select: { nodes: true } },
          },
        },
      },
    });

    const grouped = new Map<string, (typeof allProgress)[0][]>();
    for (const p of allProgress) {
      const arr = grouped.get(p.moduleId) || [];
      arr.push(p);
      grouped.set(p.moduleId, arr);
    }

    return Array.from(grouped.entries()).map(([moduleId, entries]) => {
      const latest = entries[0];
      const totalNodes = latest.module._count.nodes;
      const completed = totalNodes > 0 && entries.length >= totalNodes && entries.every((e) => e.completed);
      const readingProgress = Math.max(...entries.map((e) => e.readingProgress));
      const listeningProgress = Math.max(...entries.map((e) => e.listeningProgress));
      return {
        id: moduleId,
        userId,
        moduleId,
        slug: latest.module.slug,
        title: latest.module.title,
        category: latest.module.category,
        isPremium: latest.module.isPremium,
        listeningProgress,
        readingProgress,
        currentCharIndex: latest.currentCharIndex,
        audioRate: latest.audioRate,
        completed,
        lastReadAt: latest.lastReadAt.getTime(),
      };
    });
  }

  export async function getBySlug(userId: string, slug: string) {
    const module = await prisma.module.findUnique({ where: { slug } });
    if (!module) throw new NotFoundError("Module");

    const nodes = await prisma.userProgress.findMany({
      where: { userId, moduleId: module.id },
    });

    if (nodes.length === 0) return null;

    const totalNodes = await prisma.moduleNode.count({ where: { moduleId: module.id } });
    const completedNodes = nodes.filter((n) => n.completed).length;

    return {
      listeningProgress: Math.max(...nodes.map((n) => n.listeningProgress)),
      readingProgress: Math.max(...nodes.map((n) => n.readingProgress)),
      scrollPosition: nodes[0]?.scrollPosition ?? 0,
      currentCharIndex: nodes[0]?.currentCharIndex ?? 0,
      audioRate: nodes[0]?.audioRate ?? 1,
      completed: completedNodes >= totalNodes,
      lastReadAt: Math.max(...nodes.map((n) => n.lastReadAt.getTime())),
    };
  }

  export async function upsert(userId: string, slug: string, input: UpdateProgressInput) {
    const module = await prisma.module.findUnique({ where: { slug } });
    if (!module) throw new NotFoundError("Module");

    const { nodeId, ...rest } = input;
    const targetNodeId = nodeId || "default";

    const progress = await prisma.userProgress.upsert({
      where: {
        userId_moduleId_nodeId: { userId, moduleId: module.id, nodeId: targetNodeId },
      },
      create: {
        userId,
        moduleId: module.id,
        nodeId: targetNodeId,
        ...rest,
        lastReadAt: new Date(),
      },
      update: {
        ...rest,
        lastReadAt: new Date(),
      },
    });

    return progress;
  }

  export async function getContinueLearning(userId: string) {
    const recentModuleIds = await prisma.userProgress.groupBy({
      by: ["moduleId"],
      where: {
        userId,
        module: { isDraft: false },
        OR: [{ listeningProgress: { gt: 0 } }, { readingProgress: { gt: 0 } }],
      },
      _max: { lastReadAt: true },
      orderBy: { _max: { lastReadAt: "desc" } },
      take: 4,
    });

    if (recentModuleIds.length === 0) return [];

    const moduleIds = recentModuleIds.map((r) => r.moduleId);
    const allProgress = await prisma.userProgress.findMany({
      where: {
        userId,
        moduleId: { in: moduleIds },
      },
      orderBy: { lastReadAt: "desc" },
      include: {
        module: {
          include: {
            _count: { select: { nodes: true } },
          },
        },
      },
    });

    const grouped = new Map<string, (typeof allProgress)[0][]>();
    for (const p of allProgress) {
      const arr = grouped.get(p.moduleId) || [];
      arr.push(p);
      grouped.set(p.moduleId, arr);
    }

    return Array.from(grouped.entries()).map(([moduleId, entries]) => {
      const latest = entries[0];
      const totalNodes = latest.module._count.nodes;
      const completed = totalNodes > 0 && entries.length >= totalNodes && entries.every((e) => e.completed);
      const readingProgress = Math.max(...entries.map((e) => e.readingProgress));
      const listeningProgress = Math.max(...entries.map((e) => e.listeningProgress));
      const completedNodes = entries.filter((e) => e.completed).length;
      return {
        id: moduleId,
        slug: latest.module.slug,
        title: latest.module.title,
        description: latest.module.description,
        category: latest.module.category,
        isPremium: latest.module.isPremium,
        createdAt: latest.module.createdAt.toISOString(),
        updatedAt: latest.module.updatedAt.toISOString(),
        listeningProgress,
        readingProgress,
        completed,
        totalNodes,
        completedNodes,
        lastReadAt: latest.lastReadAt.getTime(),
      };
    });
  }

  export async function getStats(userId: string) {
    const [allProgress, totalModules, reflections, user, notebookCount] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId },
        include: {
          module: {
            include: {
              nodes: { select: { content: true } },
            },
          },
        },
        orderBy: { lastReadAt: "desc" },
      }),
      prisma.module.count({ where: { isDraft: false } }),
      prisma.reflection.findMany({
        where: { userId },
        select: { timestamp: true },
        orderBy: { timestamp: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { streakCount: true, preferredCategories: true },
      }),
      prisma.notebookEntry.count({
        where: { userId },
      }),
    ]);

    const reflectionCount = reflections.length;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    weekStart.setHours(0, 0, 0, 0);
    const weeklyReflectionDates = reflections
      .filter((r) => new Date(r.timestamp) >= weekStart)
      .map((r) => {
        const d = new Date(r.timestamp);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      });

    const moduleProgressMap = new Map<string, (typeof allProgress)[0][]>();
    for (const p of allProgress) {
      const arr = moduleProgressMap.get(p.moduleId) || [];
      arr.push(p);
      moduleProgressMap.set(p.moduleId, arr);
    }

    let totalListenSeconds = 0;
    let totalReadSeconds = 0;
    let completedCount = 0;
    let inProgressCount = 0;

    for (const [moduleId, entries] of moduleProgressMap) {
      const moduleData = entries[0].module;
      const nodeWords = (moduleData as any).nodes?.reduce((sum: number, n: any) => {
        const content = n.content ? (JSON.parse(n.content) as string[]).join(" ") : "";
        return sum + content.split(/\s+/).filter(Boolean).length;
      }, 0);
      const words = nodeWords || 0;
      const listenSeconds = Math.ceil(words / 2.5);
      const readSeconds = Math.ceil(words / 4);

      const maxListening = Math.max(...entries.map((e) => e.listeningProgress));
      const maxReading = Math.max(...entries.map((e) => e.readingProgress));

      totalListenSeconds += Math.round((maxListening / 100) * listenSeconds);
      totalReadSeconds += Math.round((maxReading / 100) * readSeconds);

      const totalNodes = moduleData.nodes?.length || 0;
      const moduleCompleted = totalNodes > 0 && entries.length >= totalNodes && entries.every((e) => e.completed);
      if (moduleCompleted) completedCount++;
      else if (maxListening > 0 || maxReading > 0) inProgressCount++;
    }

    const categoryBreakdown: Record<string, number> = {};
    for (const [, entries] of moduleProgressMap) {
      const totalNodes = entries[0].module.nodes?.length || 0;
      const allCompleted = totalNodes > 0 && entries.length >= totalNodes && entries.every((e) => e.completed);
      if (allCompleted) {
        const cat = entries[0].module.category;
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      }
    }
    const completedCategoryBreakdown = Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }));

    const recentActivity = Array.from(moduleProgressMap.values())
      .map((entries) => {
        const latest = entries[0];
        const maxListening = Math.max(...entries.map((e) => e.listeningProgress));
        const maxReading = Math.max(...entries.map((e) => e.readingProgress));
        return {
          slug: latest.module.slug,
          title: latest.module.title,
          category: latest.module.category,
          listened: maxListening,
          read: maxReading,
          lastReadAt: latest.lastReadAt,
        };
      })
      .slice(0, 5);

    const allModules = await prisma.module.findMany({
      where: { isDraft: false },
      select: { slug: true, title: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    let recommendedModules: { slug: string; title: string; category: string }[];
    const preferred = user?.preferredCategories ?? [];
    if (preferred.length > 0) {
      const preferredList = allModules.filter((m) => preferred.includes(m.category));
      recommendedModules = preferredList.length > 0
        ? preferredList.slice(0, 3).map((m) => ({ slug: m.slug, title: m.title, category: m.category }))
        : allModules.slice(0, 3).map((m) => ({ slug: m.slug, title: m.title, category: m.category }));
    } else {
      recommendedModules = allModules.slice(0, 3).map((m) => ({ slug: m.slug, title: m.title, category: m.category }));
    }

    const overallProgress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

    const listeningMinutes = Math.round(totalListenSeconds / 60);
    const readingMinutes = Math.round(totalReadSeconds / 60);
    const streak = user?.streakCount ?? 0;

    const listenXp = listeningMinutes * 10;
    const readXp = readingMinutes * 10;
    const completedXp = completedCount * 50;
    const reflectionXp = reflectionCount * 150;
    const notebookXp = notebookCount * 100;
    const streakXp = streak * 5;
    const totalXp = listenXp + readXp + completedXp + reflectionXp + notebookXp + streakXp;

    const ranks = [
      { level: 1, name: "Beginner", xp: 0 },
      { level: 2, name: "Apprentice", xp: 500 },
      { level: 3, name: "Thinker", xp: 1500 },
      { level: 4, name: "Strategist", xp: 3000 },
      { level: 5, name: "Scholar", xp: 5000 },
      { level: 6, name: "Genius", xp: 8000 },
      { level: 7, name: "Sage", xp: 12000 },
      { level: 8, name: "Master", xp: 20000 },
    ];

    let currentRank = ranks[0];
    let nextRank: typeof ranks[0] | null = ranks[1];
    for (let i = ranks.length - 1; i >= 0; i--) {
      if (totalXp >= ranks[i].xp) {
        currentRank = ranks[i];
        nextRank = i < ranks.length - 1 ? ranks[i + 1] : null;
        break;
      }
    }

    return {
      totalModules,
      completedModules: completedCount,
      overallProgress,
      listeningMinutes,
      readingMinutes,
      inProgressCount,
      historyCount: moduleProgressMap.size,
      categoryBreakdown,
      completedCategoryBreakdown,
      recentActivity,
      recommendedModules,
      reflectionCount,
      notebookCount,
      listenXp,
      readXp,
      completedXp,
      reflectionXp,
      notebookXp,
      streakXp,
      totalXp,
      rank: currentRank.name,
      rankLevel: currentRank.level,
      nextRank: nextRank?.name ?? null,
      nextLevelXp: nextRank?.xp ?? currentRank.xp,
      prevLevelXp: currentRank.xp,
      weeklyReflectionDates,
    };
  }

  export async function getStreak(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakCount: true, lastActiveDate: true },
    });
    if (!user) return { streak: 0, showPopup: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = user.lastActiveDate;
    if (!lastActive) {
      await prisma.user.update({
        where: { id: userId },
        data: { streakCount: 1, lastActiveDate: today },
      });
      return { streak: 1, showPopup: false };
    }

    const lastDay = new Date(lastActive);
    lastDay.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDay.getTime() === today.getTime()) {
      return { streak: user.streakCount, showPopup: false };
    }

    if (lastDay.getTime() === yesterday.getTime()) {
      const newStreak = user.streakCount + 1;
      await prisma.user.update({
        where: { id: userId },
        data: { streakCount: newStreak, lastActiveDate: today },
      });
      return { streak: newStreak, showPopup: false };
    }

    if (user.streakCount >= 3) {
      return { streak: user.streakCount, showPopup: true };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { streakCount: 1, lastActiveDate: today },
    });
    return { streak: 1, showPopup: false };
  }

  export async function resetStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.user.update({
      where: { id: userId },
      data: { streakCount: 0, lastActiveDate: today },
    });
    return { streak: 0 };
  }
}
