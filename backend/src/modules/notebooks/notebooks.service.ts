import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import type { UpsertNotebookInput } from "./notebooks.schema";

export namespace NotebooksService {
  export async function list(userId: string) {
    return prisma.notebookEntry.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function getBySlide(
    userId: string,
    moduleSlug: string,
    nodeId: string,
    slideIndex: number,
  ) {
    const module = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!module) throw new NotFoundError("Module");

    const entry = await prisma.notebookEntry.findUnique({
      where: {
        userId_moduleId_nodeId_slideIndex: {
          userId,
          moduleId: module.id,
          nodeId,
          slideIndex,
        },
      },
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });

    return entry;
  }

  export async function upsert(userId: string, input: UpsertNotebookInput) {
    const module = await prisma.module.findUnique({ where: { slug: input.moduleSlug } });
    if (!module) throw new NotFoundError("Module");

    return prisma.notebookEntry.upsert({
      where: {
        userId_moduleId_nodeId_slideIndex: {
          userId,
          moduleId: module.id,
          nodeId: input.nodeId,
          slideIndex: input.slideIndex,
        },
      },
      update: {
        content: input.content,
        slideContent: input.slideContent,
        nodeLabel: input.nodeLabel,
      },
      create: {
        userId,
        moduleId: module.id,
        nodeId: input.nodeId,
        nodeLabel: input.nodeLabel,
        slideIndex: input.slideIndex,
        slideContent: input.slideContent,
        content: input.content,
      },
      include: {
        module: { select: { slug: true, title: true, category: true } },
      },
    });
  }

  export async function remove(
    userId: string,
    moduleSlug: string,
    nodeId: string,
    slideIndex: number,
  ) {
    const module = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!module) throw new NotFoundError("Module");

    await prisma.notebookEntry.deleteMany({
      where: {
        userId,
        moduleId: module.id,
        nodeId,
        slideIndex,
      },
    });

    return { deleted: true };
  }
}
