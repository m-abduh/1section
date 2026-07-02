import { prisma } from "../../lib/prisma";
import type { CreateReviewInput } from "./reviews.schema";

export namespace ReviewsService {
  export async function list(userId: string, all?: boolean) {
    if (all) {
      return prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          module: { select: { slug: true, title: true } },
        },
      });
    }
    return prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        module: { select: { slug: true, title: true } },
      },
    });
  }

  export async function create(userId: string, input: CreateReviewInput) {
    let moduleId: string | undefined;

    if (input.moduleSlug) {
      const mod = await prisma.module.findUnique({ where: { slug: input.moduleSlug } });
      if (mod) moduleId = mod.id;
    }

    return prisma.review.create({
      data: {
        userId,
        moduleId,
        rating: input.rating,
        comment: input.comment || "",
      },
    });
  }
}
