import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { env } from "../../config/env";
import type { RegisterInput, LoginInput, GoogleAuthInput, UpdateProfileInput, UpdatePreferencesInput } from "./auth.schema";

async function ensureAdminRole(userId: string, email: string) {
  if (env.adminEmail && email.toLowerCase() === env.adminEmail.toLowerCase()) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user && user.role !== "ADMIN") {
      await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    }
  }
}

export namespace AuthService {
  export async function register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("Email already registered");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name || null,
      },
    });

    await ensureAdminRole(user.id, user.email);

    const final = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    const token = signToken({ userId: final.id, email: final.email, role: final.role });
    return {
      token,
      user: { id: final.id, email: final.email, name: final.name, avatar: final.avatar, role: final.role, subscriptionStatus: final.subscriptionStatus, preferredCategories: final.preferredCategories },
    };
  }

  export async function login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedError("Invalid email or password");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    await ensureAdminRole(user.id, user.email);

    const final = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    const token = signToken({ userId: final.id, email: final.email, role: final.role });
    return {
      token,
      user: { id: final.id, email: final.email, name: final.name, avatar: final.avatar, role: final.role, subscriptionStatus: final.subscriptionStatus, preferredCategories: final.preferredCategories },
    };
  }

  export async function googleAuth(input: GoogleAuthInput) {
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: input.googleId }, { email: input.email }] },
    });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: input.googleId, avatar: input.avatar || user.avatar },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email: input.email,
          googleId: input.googleId,
          name: input.name || null,
          avatar: input.avatar || null,
        },
      });
    }

    await ensureAdminRole(user.id, user.email);

    const final = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    const token = signToken({ userId: final.id, email: final.email, role: final.role });
    return {
      token,
      user: { id: final.id, email: final.email, name: final.name, avatar: final.avatar, role: final.role, subscriptionStatus: final.subscriptionStatus, preferredCategories: final.preferredCategories },
    };
  }

  export async function getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User");

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEnd: user.subscriptionEnd,
      preferredCategories: user.preferredCategories,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  export async function updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
    });

    return { id: user.id, email: user.email, name: user.name, avatar: user.avatar };
  }

  export async function getPreferences(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredCategories: true },
    });
    if (!user) throw new NotFoundError("User");
    return { preferredCategories: user.preferredCategories };
  }

  export async function updatePreferences(userId: string, input: UpdatePreferencesInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { preferredCategories: input.preferredCategories },
      select: { preferredCategories: true },
    });
    return { preferredCategories: user.preferredCategories };
  }

  export async function listUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        streakCount: true,
        lastActiveDate: true,
        preferredCategories: true,
        createdAt: true,
      },
    });
  }
}
