import { prisma } from "../../lib/prisma";
import { NotFoundError, ConflictError } from "../../lib/errors";
import { transformNode, transformEdge } from "../../lib/transform";

export namespace FavoritesService {
  export async function list(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { userId, module: { isDraft: false } },
      orderBy: { createdAt: "desc" },
      include: {
        module: {
          include: {
            nodes: { orderBy: { id: "asc" } },
            edges: { orderBy: { id: "asc" } },
            category: { select: { name: true } },
            _count: { select: { questions: true } },
          },
        },
      },
    });

    return favorites.map((f) => ({
      id: f.id,
      moduleId: f.module.id,
      slug: f.module.slug,
      title: f.module.title,
      description: f.module.description,
      category: f.module.category?.name || null,
      isPremium: f.module.isPremium,
      nodes: f.module.nodes.map(transformNode),
      edges: f.module.edges.map(transformEdge),
      questionCount: f.module._count.questions,
      createdAt: f.createdAt,
    }));
  }

  export async function add(userId: string, moduleSlug: string) {
    const module = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!module) throw new NotFoundError("Module");

    const existing = await prisma.favorite.findUnique({
      where: { userId_moduleId: { userId, moduleId: module.id } },
    });
    if (existing) throw new ConflictError("Already in favorites");

    return prisma.favorite.create({
      data: { userId, moduleId: module.id },
    });
  }

  export async function remove(userId: string, moduleSlug: string) {
    const module = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!module) throw new NotFoundError("Module");

    const existing = await prisma.favorite.findUnique({
      where: { userId_moduleId: { userId, moduleId: module.id } },
    });
    if (!existing) throw new NotFoundError("Favorite");

    await prisma.favorite.delete({
      where: { userId_moduleId: { userId, moduleId: module.id } },
    });

    return { deleted: true };
  }

  export async function check(userId: string, moduleSlug: string) {
    const module = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!module) return false;

    const existing = await prisma.favorite.findUnique({
      where: { userId_moduleId: { userId, moduleId: module.id } },
    });

    return !!existing;
  }
}
