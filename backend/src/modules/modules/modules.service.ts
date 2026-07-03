import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { transformNode, transformEdge } from "../../lib/transform";
import { Cache } from "../../lib/cache";

export namespace ModulesService {
  const nodeMiniSelect = {
    id: true,
    positionX: true,
    positionY: true,
    label: true,
    slug: true,
    type: true,
    style: true,
  } satisfies Prisma.ModuleNodeSelect;

  const moduleInclude = {
    nodes: { orderBy: { id: "asc" as const } },
    edges: { orderBy: { id: "asc" as const } },
    questions: { orderBy: { id: "asc" as const } },
    _count: { select: { questions: true } },
  } satisfies Prisma.ModuleInclude;

  const listInclude = {
    nodes: { select: nodeMiniSelect, orderBy: { id: "asc" as const } },
    edges: { orderBy: { id: "asc" as const } },
    _count: { select: { questions: true } },
  };

  function calculateWordCount(nodes: { content?: string | string[] | null }[]): number {
    return nodes.reduce((sum, n) => {
      if (!n.content) return sum;
      try {
        const arr = Array.isArray(n.content) ? n.content : JSON.parse(n.content) as string[];
        const text = arr.join(" ");
        return sum + text.split(/\s+/).filter(Boolean).length;
      } catch {
        return sum;
      }
    }, 0);
  }

  function listCacheParams(query: {
    page?: number; limit?: number; category?: string;
    categories?: string; search?: string; userId?: string; admin?: boolean;
    preferred?: boolean;
  }): Record<string, unknown> {
    return {
      page: query.page ?? 1,
      limit: query.limit ?? 12,
      category: query.category ?? "",
      categories: query.categories ?? "",
      search: query.search ?? "",
      admin: query.admin ?? false,
      preferred: query.preferred ?? false,
    };
  }

  async function invalidateModuleCaches(): Promise<void> {
    await Promise.all([
      Cache.delByPattern(`${Cache.PREFIXES.MODULES_LIST}:*`),
      Cache.del(Cache.PREFIXES.MODULES_CATEGORIES),
      Cache.del(Cache.PREFIXES.CATEGORIES_LIST),
      Cache.del(Cache.PREFIXES.DAILY_FREE),
      Cache.del(Cache.PREFIXES.DAILY_FREE_SLUG),
    ]);
  }

  const DAILY_FREE_TTL = 86400;

  /** Deterministic daily free module slug based on current date */
  export async function getDailyFreeSlug(): Promise<string | null> {
    const cacheKey = Cache.PREFIXES.DAILY_FREE_SLUG;
    const cached = await Cache.get<string>(cacheKey);
    if (cached) return cached;

    const count = await prisma.module.count({ where: { isDraft: false } });
    if (count === 0) return null;

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const hash = dateStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const index = hash % count;

    const module = await prisma.module.findMany({
      where: { isDraft: false },
      take: 1,
      skip: index,
      select: { slug: true },
      orderBy: { createdAt: "asc" },
    });

    const slug = module[0]?.slug || null;
    if (slug) await Cache.set(cacheKey, slug, DAILY_FREE_TTL);
    return slug;
  }

  /** Check if user has an active subscription */
  async function hasActiveSubscription(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, subscriptionEnd: true },
    });
    if (!user || user.subscriptionStatus === "FREE") return false;
    if (user.subscriptionEnd && user.subscriptionEnd < new Date()) return false;
    return true;
  }

  export async function list(query: {
    page?: number;
    limit?: number;
    category?: string;
    categories?: string;
    search?: string;
    userId?: string;
    admin?: boolean;
    preferred?: boolean;
  }) {
    const page = Math.max(1, query.page || 1);
    const maxLimit = query.admin ? 1000 : 50;
    let limit = Math.min(maxLimit, Math.max(1, query.limit || 12));
    const skip = (page - 1) * limit;

    if (query.preferred && query.userId) {
      const user = await prisma.user.findUnique({
        where: { id: query.userId },
        select: { preferredCategories: true },
      });
      if (user?.preferredCategories?.length) {
        query.categories = user.preferredCategories.join(",");
        limit = 3;
      }
    }

    const shouldCache = !query.search && !query.category && !query.categories && !query.userId && !query.admin;

    if (shouldCache) {
      const params = listCacheParams(query);
      const cacheKey = Cache.key(Cache.PREFIXES.MODULES_LIST, params);
      const cached = await Cache.get<{
        data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.ModuleWhereInput = {};
    if (!query.admin) where.isDraft = false;

    if (query.categories) {
      const cats = query.categories.split(",").map((c) => c.trim()).filter(Boolean);
      if (cats.length > 0) {
        where.category = { in: cats };
      }
    } else if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [modules, total] = await Promise.all([
      prisma.module.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: query.userId
          ? { ...listInclude, favorites: { where: { userId: query.userId } } }
          : listInclude,
      }),
      prisma.module.count({ where }),
    ]);

    const dailyFreeSlug = await getDailyFreeSlug();

    const result = {
      data: modules.map((m: any) => {
        return {
          id: m.id,
          slug: m.slug,
          title: m.title,
          description: m.description,
          category: m.category,
          isPremium: m.isPremium,
          isDraft: m.isDraft,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          nodes: m.nodes.map((n: any) => ({ id: n.id, position: { x: n.positionX, y: n.positionY }, data: { label: n.label, nodeSlug: n.slug || undefined }, type: n.type || "custom", style: n.style || undefined })),
          edges: m.edges.map(transformEdge),
          _count: m._count,
          isFavorited: query.userId ? m.favorites?.length > 0 : false,
          isDailyFree: m.slug === dailyFreeSlug,
          favorites: undefined,
          listenMin: Math.max(1, Math.ceil((m.wordCount || 0) / 150)),
          readMin: Math.max(1, Math.ceil((m.wordCount || 0) / 240)),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    if (shouldCache) {
      const params = listCacheParams(query);
      const cacheKey = Cache.key(Cache.PREFIXES.MODULES_LIST, params);
      await Cache.set(cacheKey, result);
    }

    return result;
  }

  export async function getDailyFree() {
    const cacheKey = Cache.PREFIXES.DAILY_FREE;
    const cached = await Cache.get<any>(cacheKey);
    if (cached) return cached;

    const slug = await getDailyFreeSlug();
    if (!slug) throw new NotFoundError("No modules available");

    const module = await prisma.module.findUnique({
      where: { slug },
      include: moduleInclude,
    });

    if (!module) throw new NotFoundError("Module");

    const result = {
      ...module,
      isPremium: false,
      nodes: module.nodes.map(transformNode),
      edges: module.edges.map(transformEdge),
    };

    await Cache.set(cacheKey, result, DAILY_FREE_TTL);
    return result;
  }

  export async function getBySlug(slug: string, userId?: string, admin?: boolean) {
    const dailyFreeSlug = await getDailyFreeSlug();
    const isDailyFree = dailyFreeSlug === slug;

    const module = await prisma.module.findUnique({
      where: { slug },
      include: {
        nodes: { select: nodeMiniSelect, orderBy: { id: "asc" as const } },
        edges: { orderBy: { id: "asc" as const } },
        _count: { select: { questions: true } },
      },
    });

    if (!module) throw new NotFoundError("Module");

    // Block draft modules for non-admin users
    if (module.isDraft && !admin) throw new NotFoundError("Module");

    const isSubscribed = await hasActiveSubscription(userId);

    // Free access for admin, daily free module, subscribed users, or free modules
    if (admin || isDailyFree || isSubscribed || !module.isPremium) {
      const fullModule = await prisma.module.findUnique({
        where: { slug },
        include: moduleInclude,
      });
      if (!fullModule) throw new NotFoundError("Module");

      const nodeProgress = userId
        ? await prisma.userProgress.findMany({
            where: { userId, moduleId: module.id, completed: true },
            select: { nodeId: true },
          })
        : [];
      const completedNodeIds = new Set(nodeProgress.map((p) => p.nodeId));

      const isFavorited = userId
        ? !!(await prisma.favorite.findUnique({
            where: { userId_moduleId: { userId, moduleId: module.id } },
          }))
        : false;

      return {
        ...fullModule,
        isPremium: module.isPremium,
        isFavorited,
        nodes: fullModule.nodes.map((n) => {
          const transformed = transformNode(n);
          return {
            ...transformed,
            data: { ...transformed.data, isCompleted: completedNodeIds.has(transformed.data.nodeSlug || n.id) },
          };
        }),
        edges: fullModule.edges.map(transformEdge),
      };
    }

    // Locked — return metadata only, no content
    return {
      id: module.id,
      slug: module.slug,
      title: module.title,
      description: module.description,
      category: module.category,
      isPremium: true,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      nodes: module.nodes.map((n: any) => ({ id: n.id, position: { x: n.positionX, y: n.positionY }, data: { label: n.label, nodeSlug: n.slug || undefined }, type: n.type || "custom", style: n.style || undefined })),
      edges: module.edges.map(transformEdge),
      _count: { questions: module._count?.questions || 0 },
      locked: true,
      questions: undefined,
    };
  }

  export async function getCategories() {
    const cacheKey = Cache.key(Cache.PREFIXES.MODULES_CATEGORIES);

    const cached = await Cache.get<{ name: string; count: number }[]>(cacheKey);
    if (cached) return cached;

    const catCounts = await prisma.module.groupBy({
      by: ["category"],
      where: { isDraft: false },
      _count: { category: true },
      orderBy: { category: "asc" },
    });

    const result = catCounts.map((c) => ({ name: c.category, count: c._count.category }));

    await Cache.set(cacheKey, result);
    return result;
  }

  export async function getRecommended(slug: string, limit: number = 3) {
    const mod = await prisma.module.findUnique({ where: { slug } });
    if (!mod) throw new NotFoundError("Module");

    const recommendations = await prisma.module.findMany({
      where: {
        category: mod.category,
        slug: { not: slug },
        isDraft: false,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return recommendations;
  }

  export async function checkAccess(slug: string, userId?: string) {
    const dailyFreeSlug = await getDailyFreeSlug();
    if (dailyFreeSlug === slug) return { accessible: true, isDailyFree: true };

    const isSubscribed = await hasActiveSubscription(userId);
    return { accessible: isSubscribed, isDailyFree: false };
  }

  export async function create(data: {
    slug: string;
    title: string;
    description: string;
    category: string;
    isPremium?: boolean;
    isDraft?: boolean;
    nodes?: { id: string; positionX: number; positionY: number; label: string; slug?: string; description?: string; content?: string[]; type?: string; style?: any }[];
    edges?: { id: string; source: string; target: string; label?: string; animated?: boolean }[];
    questions?: { question: string; options: string[]; correctAnswer: number; explanation?: string }[];
  }) {
    const existing = await prisma.module.findUnique({ where: { slug: data.slug } });
    if (existing) throw new Error("A module with this slug already exists");

    const wordCount = calculateWordCount(data.nodes || []);

    await invalidateModuleCaches();

    return prisma.module.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        category: data.category,
        isPremium: data.isPremium ?? true,
        isDraft: data.isDraft ?? true,
        wordCount,
        nodes: data.nodes?.length
          ? { create: data.nodes.map((n) => ({ id: n.id, positionX: n.positionX, positionY: n.positionY, label: n.label, slug: n.slug, description: n.description, content: n.content ? JSON.stringify(n.content) : undefined, type: n.type ?? "custom", style: n.style })) }
          : undefined,
        edges: data.edges?.length
          ? { create: data.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, animated: e.animated ?? true })) }
          : undefined,
        questions: data.questions?.length
          ? { create: data.questions.map((q) => ({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation ?? "" })) }
          : undefined,
      },
      include: moduleInclude,
    });
  }

  export async function update(
    slug: string,
    data: {
      slug?: string;
      title?: string;
      description?: string;
      category?: string;
      content?: string;
      isPremium?: boolean;
      isDraft?: boolean;
      nodes?: { id: string; positionX: number; positionY: number; label: string; slug?: string; description?: string; content?: string[]; type?: string; style?: any }[];
      edges?: { id: string; source: string; target: string; label?: string; animated?: boolean }[];
      questions?: { question: string; options: string[]; correctAnswer: number; explanation?: string }[];
    }
  ) {
    const existing = await prisma.module.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundError("Module");

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isPremium !== undefined) updateData.isPremium = data.isPremium;
    if (data.isDraft !== undefined) updateData.isDraft = data.isDraft;
    if (data.slug !== undefined) {
      const slugExists = await prisma.module.findUnique({ where: { slug: data.slug } });
      if (slugExists && slugExists.id !== existing.id) throw new Error("A module with this slug already exists");
      updateData.slug = data.slug;
    }

    if (data.nodes !== undefined) {
      await prisma.moduleNode.deleteMany({ where: { moduleId: existing.id } });
      if (data.nodes.length > 0) {
        await prisma.moduleNode.createMany({
          data: data.nodes.map((n) => ({
            id: n.id,
            moduleId: existing.id,
            positionX: n.positionX,
            positionY: n.positionY,
            label: n.label,
            slug: n.slug,
            description: n.description,
            content: n.content ? JSON.stringify(n.content) : undefined,
            type: n.type ?? "custom",
            style: n.style,
          })),
        });
      }
      updateData.wordCount = calculateWordCount(data.nodes);
    }

    if (data.edges !== undefined) {
      await prisma.moduleEdge.deleteMany({ where: { moduleId: existing.id } });
      if (data.edges.length > 0) {
        await prisma.moduleEdge.createMany({
          data: data.edges.map((e) => ({
            id: e.id,
            moduleId: existing.id,
            source: e.source,
            target: e.target,
            label: e.label,
            animated: e.animated ?? true,
          })),
        });
      }
    }

    if (data.questions !== undefined) {
      await prisma.question.deleteMany({ where: { moduleId: existing.id } });
      if (data.questions.length > 0) {
        await prisma.question.createMany({
          data: data.questions.map((q) => ({
            moduleId: existing.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? "",
          })),
        });
      }
    }

    await invalidateModuleCaches();

    return prisma.module.update({
      where: { id: existing.id },
      data: updateData,
      include: moduleInclude,
    });
  }

  export async function remove(slug: string) {
    const mod = await prisma.module.findUnique({ where: { slug } });
    if (!mod) throw new NotFoundError("Module");

    await prisma.module.delete({ where: { id: mod.id } });

    await invalidateModuleCaches();
  }
}
