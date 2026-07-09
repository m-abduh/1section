import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `FATAL: ${name} environment variable is not set. ` +
      "The app will refuse to start. Check .env.example for all required variables."
    );
  }
  return val;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: JWT_SECRET environment variable is not set in production. " +
      "Set a strong, unique secret or the app will refuse to start."
    );
  }
  return secret || "dev-secret-change-in-production";
}

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  jwt: {
    secret: getJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  lemonSqueezy: {
    devApiKey: process.env.LEMONSQUEEZY_API_KEY_DEV || process.env.LEMONSQUEEZY_API_KEY || "",
    prodApiKey: process.env.LEMONSQUEEZY_API_KEY_PROD || "",
    storeId: process.env.LEMONSQUEEZY_STORE_ID || "",
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
  },

  adminEmail: process.env.ADMIN_EMAIL || "",

  publicUrl: process.env.PUBLIC_URL || "http://localhost:4000",

  redis: {
    url: process.env.REDIS_URL || "",
  },
} as const;
