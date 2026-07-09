import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { env } from "../../config/env";
import type { RegisterInput, LoginInput, GoogleAuthInput, UpdateProfileInput, UpdatePreferencesInput, GoogleProfile } from "./auth.schema";

const googleClient = new OAuth2Client(env.google.clientId);

async function ensureAdminRole(userId: string, email: string) {
  if (env.adminEmail && email.toLowerCase() === env.adminEmail.toLowerCase()) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user && user.role !== "ADMIN") {
      await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    }
  }
}

function buildAuthResponse(user: { id: string; email: string; name: string | null; avatar: string | null; role: string; subscriptionStatus: string; preferredCategories: string[] }) {
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role, subscriptionStatus: user.subscriptionStatus, preferredCategories: user.preferredCategories },
  };
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

    return buildAuthResponse(user);
  }

  export async function login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedError("Invalid email or password");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    await ensureAdminRole(user.id, user.email);

    return buildAuthResponse(user);
  }

  export async function googleAuth(input: GoogleAuthInput) {
    let profile: GoogleProfile;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: env.google.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedError("Invalid Google token");
      }
      profile = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (err: unknown) {
      // If verifyIdToken fails, try exchanging auth code
      if (
        input.idToken.length > 50 &&
        !input.idToken.startsWith("eyJ") // JWTs start with base64url encoded JSON
      ) {
        try {
          const { tokens } = await googleClient.getToken(input.idToken);
          if (tokens.id_token) {
            const ticket = await googleClient.verifyIdToken({
              idToken: tokens.id_token,
              audience: env.google.clientId,
            });
            const payload = ticket.getPayload();
            if (payload && payload.sub && payload.email) {
              profile = {
                sub: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
              };
            } else {
              throw new UnauthorizedError("Invalid Google token");
            }
          } else {
            throw new UnauthorizedError("Google code exchange failed");
          }
        } catch {
          throw new UnauthorizedError("Google authentication failed");
        }
      } else {
        throw new UnauthorizedError("Google token verification failed");
      }
    }

    let user = await prisma.user.upsert({
      where: { googleId: profile.sub },
      update: {
        email: profile.email,
        avatar: profile.picture || undefined,
        name: profile.name || undefined,
      },
      create: {
        email: profile.email,
        googleId: profile.sub,
        name: profile.name || null,
        avatar: profile.picture || null,
      },
    });

    if (user.email !== profile.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: profile.email } });
      if (existingEmail && !existingEmail.googleId) {
        user = await prisma.user.update({
          where: { id: existingEmail.id },
          data: { googleId: profile.sub, avatar: profile.picture || existingEmail.avatar },
        });
      }
    }

    await ensureAdminRole(user.id, user.email);

    return buildAuthResponse(user);
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
