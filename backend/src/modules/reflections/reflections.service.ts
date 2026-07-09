import { prisma } from "../../lib/prisma";
import { NotFoundError, ForbiddenError } from "../../lib/errors";
import type { CreateReflectionInput, UpdateReflectionInput } from "./reflections.schema";

async function getOwnedReflection(userId: string, id: string) {
  const reflection = await prisma.reflection.findFirst({
    where: { id, userId },
  });
  if (!reflection) {
    const existing = await prisma.reflection.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("Reflection");
    throw new ForbiddenError();
  }
  return reflection;
}

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
    return getOwnedReflection(userId, id);
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
    await getOwnedReflection(userId, id);

    return prisma.reflection.update({
      where: { id },
      data: input,
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function remove(userId: string, id: string) {
    await getOwnedReflection(userId, id);

    await prisma.reflection.delete({ where: { id } });
    return { deleted: true };
  }
}
