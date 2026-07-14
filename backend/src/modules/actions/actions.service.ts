import { prisma } from "../../lib/prisma";
import { NotFoundError, ForbiddenError } from "../../lib/errors";
import type { CreateActionInput, UpdateActionInput } from "./actions.schema";

async function getOwnedPlan(userId: string, id: string) {
  const plan = await prisma.actionPlan.findFirst({
    where: { id, userId },
  });
  if (!plan) {
    const existing = await prisma.actionPlan.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("ActionPlan");
    throw new ForbiddenError();
  }
  return plan;
}

export namespace ActionsService {
  export async function list(userId: string) {
    return prisma.actionPlan.findMany({
      where: { userId },
      orderBy: { appliedAt: "desc" },
      include: {
        module: { select: { slug: true, title: true, category: { select: { name: true } } } },
      },
    });
  }

  export async function getByModule(userId: string, slug: string) {
    const module = await prisma.module.findUnique({ where: { slug } });
    if (!module) throw new NotFoundError("Module");
    return prisma.actionPlan.findUnique({
      where: { userId_moduleId: { userId, moduleId: module.id } },
      include: {
        module: { select: { slug: true, title: true, category: { select: { name: true } } } },
      },
    });
  }

  export async function getById(userId: string, id: string) {
    return getOwnedPlan(userId, id);
  }

  export async function create(userId: string, input: CreateActionInput) {
    const module = await prisma.module.findUnique({ where: { slug: input.moduleSlug } });
    if (!module) throw new NotFoundError("Module");

    const existing = await prisma.actionPlan.findUnique({
      where: { userId_moduleId: { userId, moduleId: module.id } },
    });
    if (existing) throw new Error("Action plan already exists for this module");

    return prisma.actionPlan.create({
      data: {
        userId,
        moduleId: module.id,
        title: input.title,
        content: input.content,
      },
      include: {
        module: { select: { slug: true, title: true, category: { select: { name: true } } } },
      },
    });
  }

  export async function update(userId: string, id: string, input: UpdateActionInput) {
    await getOwnedPlan(userId, id);

    return prisma.actionPlan.update({
      where: { id },
      data: input,
      include: {
        module: { select: { slug: true, title: true, category: { select: { name: true } } } },
      },
    });
  }

  export async function remove(userId: string, id: string) {
    await getOwnedPlan(userId, id);

    await prisma.actionPlan.delete({ where: { id } });
    return { deleted: true };
  }
}
