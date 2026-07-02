import { prisma } from "../../lib/prisma";
import { NotFoundError, ForbiddenError } from "../../lib/errors";
import type { CreateActionInput, UpdateActionInput } from "./actions.schema";

export namespace ActionsService {
  export async function list(userId: string) {
    return prisma.actionPlan.findMany({
      where: { userId },
      orderBy: { appliedAt: "desc" },
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function getByModule(userId: string, slug: string) {
    const module = await prisma.module.findUnique({ where: { slug } });
    if (!module) throw new NotFoundError("Module");
    return prisma.actionPlan.findUnique({
      where: { userId_moduleId: { userId, moduleId: module.id } },
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function getById(userId: string, id: string) {
    const plan = await prisma.actionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError("ActionPlan");
    if (plan.userId !== userId) throw new ForbiddenError();
    return plan;
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
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function update(userId: string, id: string, input: UpdateActionInput) {
    const plan = await prisma.actionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError("ActionPlan");
    if (plan.userId !== userId) throw new ForbiddenError();

    return prisma.actionPlan.update({
      where: { id },
      data: input,
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function remove(userId: string, id: string) {
    const plan = await prisma.actionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError("ActionPlan");
    if (plan.userId !== userId) throw new ForbiddenError();

    await prisma.actionPlan.delete({ where: { id } });
    return { deleted: true };
  }
}
