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

function moduleCountInclude() {
  return { _count: { select: { modules: true } } };
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

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { sortOrder: "asc" },
        include: moduleCountInclude(),
      }),
      prisma.category.count({ where: where as any }),
    ]);

    return {
      data: categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  export async function listAll() {
    const cacheKey = Cache.key(Cache.PREFIXES.CATEGORIES_LIST);

    const cached = await Cache.get<Array<Record<string, unknown>>>(cacheKey);
    if (cached) return cached;

    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: moduleCountInclude(),
    });

    await Cache.set(cacheKey, categories);
    return categories;
  }

  export async function getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        ...moduleCountInclude(),
        modules: {
          select: { id: true, title: true, slug: true },
          orderBy: { title: "asc" },
        },
      },
    });

    if (!category) throw new NotFoundError("Category");
    return category;
  }

  export async function getBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        ...moduleCountInclude(),
        modules: {
          select: { id: true, title: true, slug: true },
          orderBy: { title: "asc" },
        },
      },
    });

    if (!category) throw new NotFoundError("Category");
    return category;
  }

  export async function create(data: {
    name: string;
    slug?: string;
    description?: string;
    sortOrder?: number;
  }) {
    const slug = data.slug || slugify(data.name);

    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: data.name, mode: "insensitive" } },
          { slug },
        ],
      },
    });

    if (existing) {
      throw new ConflictError(
        existing.name.toLowerCase() === data.name.toLowerCase()
          ? "Category with this name already exists"
          : "Category with this slug already exists"
      );
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        sortOrder: data.sortOrder || 0,
      },
      include: moduleCountInclude(),
    });

    await invalidateCategoryCaches();
    return category;
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
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Category");

    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const conflict = await prisma.category.findFirst({
        where: {
          name: { equals: data.name, mode: "insensitive" },
          id: { not: id },
        },
      });
      if (conflict) throw new ConflictError("Category with this name already exists");
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await prisma.category.findUnique({
        where: { slug: data.slug },
      });
      if (conflict) throw new ConflictError("Category with this slug already exists");
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
      include: {
        ...moduleCountInclude(),
        modules: {
          select: { id: true, title: true, slug: true },
          orderBy: { title: "asc" },
        },
      },
    });

    await invalidateCategoryCaches();
    return category;
  }

  export async function remove(id: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Category");

    await prisma.category.delete({ where: { id } });
    await invalidateCategoryCaches();
  }
}