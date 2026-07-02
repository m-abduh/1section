import { prisma } from "../../lib/prisma";
import { NotFoundError, ForbiddenError } from "../../lib/errors";
import type { CreateReflectionInput, UpdateReflectionInput } from "./reflections.schema";

export namespace ReflectionsService {
  export async function list(userId: string) {
    return prisma.reflection.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function getById(userId: string, id: string) {
    const reflection = await prisma.reflection.findUnique({ where: { id } });
    if (!reflection) throw new NotFoundError("Reflection");
    if (reflection.userId !== userId) throw new ForbiddenError();
    return reflection;
  }

  export async function create(userId: string, input: CreateReflectionInput) {
    const module = await prisma.module.findUnique({ where: { slug: input.moduleSlug } });
    if (!module) throw new NotFoundError("Module");

    return prisma.reflection.create({
      data: {
        userId,
        moduleId: module.id,
        title: input.title,
        content: input.content,
      },
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function update(userId: string, id: string, input: UpdateReflectionInput) {
    const reflection = await prisma.reflection.findUnique({ where: { id } });
    if (!reflection) throw new NotFoundError("Reflection");
    if (reflection.userId !== userId) throw new ForbiddenError();

    return prisma.reflection.update({
      where: { id },
      data: input,
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function remove(userId: string, id: string) {
    const reflection = await prisma.reflection.findUnique({ where: { id } });
    if (!reflection) throw new NotFoundError("Reflection");
    if (reflection.userId !== userId) throw new ForbiddenError();

    await prisma.reflection.delete({ where: { id } });
    return { deleted: true };
  }
}
