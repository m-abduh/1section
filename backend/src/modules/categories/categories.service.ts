import { prisma } from "../../lib/prisma";
import { NotFoundError, ConflictError } from "../../lib/errors";
import { Cache } from "../../lib/cache";
import { slugify } from "../../lib/transform";

async function invalidateCategoryCaches(): Promise<void> {
  await Promise.all([
    Cache.del(Cache.PREFIXES.CATEGORIES_LIST),
    Cache.delByPattern(`${Cache.PREFIXES.MODULES_LIST}:*`),
    Cache.del(Cache.PREFIXES.MODULES_CATEGORIES),
  ]);
}

export namespace CategoriesService {
  export async function list(query: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    let catCounts = await prisma.module.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { category: "asc" },
    });

    let categories = catCounts
      .filter((c) => c.category && c.category.trim().length > 0)
      .map((c) => ({
        id: slugify(c.category),
        name: c.category,
        slug: slugify(c.category),
        description: null as string | null,
        sortOrder: 0,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        _count: { modules: c._count.category },
      }));

    if (query.search) {
      const q = query.search.toLowerCase();
      categories = categories.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      );
    }

    const total = categories.length;
    const paginated = categories.slice(skip, skip + limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  export async function listAll() {
    const cacheKey = Cache.key(Cache.PREFIXES.CATEGORIES_LIST);

    const cached = await Cache.get<{
      id: string; name: string; slug: string; description: string | null;
      sortOrder: number; createdAt: Date; updatedAt: Date;
      _count: { modules: number };
    }[]>(cacheKey);
    if (cached) return cached;

    const catCounts = await prisma.module.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { category: "asc" },
    });

    const result = catCounts
      .filter((c) => c.category && c.category.trim().length > 0)
      .map((c) => ({
        id: slugify(c.category),
        name: c.category,
        slug: slugify(c.category),
        description: null as string | null,
        sortOrder: 0,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        _count: { modules: c._count.category },
      }));

    await Cache.set(cacheKey, result);
    return result;
  }

  export async function getById(id: string) {
    const catCounts = await prisma.module.groupBy({
      by: ["category"],
      _count: { category: true },
    });

    const matched = catCounts.find((c) => slugify(c.category) === id);

    if (!matched) throw new NotFoundError("Category");

    const modules = await prisma.module.findMany({
      where: { category: matched.category },
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    });

    return {
      id: slugify(matched.category),
      name: matched.category,
      slug: slugify(matched.category),
      description: null as string | null,
      sortOrder: 0,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      _count: { modules: matched._count.category },
      modules,
    };
  }

  export async function create(data: {
    name: string;
    slug?: string;
    description?: string;
    sortOrder?: number;
  }) {
    const existing = await prisma.module.findFirst({
      where: { category: data.name },
      select: { id: true },
    });

    if (existing) throw new ConflictError("Category with this name already exists");

    await invalidateCategoryCaches();

    return {
      id: slugify(data.name),
      name: data.name,
      slug: slugify(data.name),
      description: data.description || null,
      sortOrder: data.sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { modules: 0 },
    };
  }

  export async function update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      sortOrder?: number;
    }
  ) {
    if (!data.name) {
      return getById(id);
    }

    const catCounts = await prisma.module.groupBy({
      by: ["category"],
      _count: { category: true },
    });

    const oldCategory = catCounts.find((c) => slugify(c.category) === id);

    if (!oldCategory) throw new NotFoundError("Category");

    if (data.name && data.name !== oldCategory.category) {
      const existing = await prisma.module.findFirst({
        where: { category: data.name },
        select: { id: true },
      });

      if (existing) throw new ConflictError("Category with this name already exists");

      await prisma.module.updateMany({
        where: { category: oldCategory.category },
        data: { category: data.name },
      });
    }

    await invalidateCategoryCaches();

    const modules = await prisma.module.findMany({
      where: { category: data.name },
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    });

    return {
      id: slugify(data.name),
      name: data.name,
      slug: slugify(data.name),
      description: data.description || null,
      sortOrder: data.sortOrder || 0,
      createdAt: new Date(0),
      updatedAt: new Date(),
      _count: { modules: modules.length },
      modules,
    };
  }

  export async function remove(id: string) {
    const catCounts = await prisma.module.groupBy({
      by: ["category"],
      _count: { category: true },
    });

    const matched = catCounts.find((c) => slugify(c.category) === id);

    if (!matched) throw new NotFoundError("Category");

    await prisma.module.updateMany({
      where: { category: matched.category },
      data: { category: "" },
    });

    await invalidateCategoryCaches();
  }
}
