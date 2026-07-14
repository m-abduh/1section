import dotenv from "dotenv";
dotenv.config();

/**
 * Assert a required env var is set. Use for values the app cannot start without.
 * Optional fields should use `|| ""` directly in the config object instead.
 */
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
  if (!secret) {
    throw new Error(
      "FATAL: JWT_SECRET environment variable is not set. " +
      "Set a strong, unique secret or the app will refuse to start."
    );
  }
  return secret;
}

export const env = {
  // Required: PORT fallback to 4000
  port: parseInt(process.env.PORT || "4000", 10),
  // Required: NODE_ENV fallback to "development"
  nodeEnv: process.env.NODE_ENV || "development",

  jwt: {
    // Required: JWT_SECRET — app throws on startup if missing
    secret: getJwtSecret(),
    // Optional: defaults to 7d
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  lemonSqueezy: {
    // Optional: defaults to ""
    devApiKey: process.env.LEMONSQUEEZY_API_KEY_DEV || process.env.LEMONSQUEEZY_API_KEY || "",
    // Optional: defaults to ""
    prodApiKey: process.env.LEMONSQUEEZY_API_KEY_PROD || "",
    // Optional: defaults to ""
    storeId: process.env.LEMONSQUEEZY_STORE_ID || "",
    // Optional: defaults to "" — only needed for webhook verification
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "",
  },

  google: {
    // Optional: OAuth won't work without it but app can start
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    // Optional: same as above
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },

  ai: {
    provider: process.env.AI_PROVIDER || "groq",
    apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "",
  },

  // Optional: admin endpoints check this at runtime
  adminEmail: process.env.ADMIN_EMAIL || "",

  // Optional: defaults to localhost for dev
  publicUrl: process.env.PUBLIC_URL || "http://localhost:4000",

  cookie: {
    // Optional: defaults to ""
    domain: process.env.COOKIE_DOMAIN || "",
    secure: process.env.NODE_ENV === "production",
  },

  redis: {
    // Optional: app degrades gracefully if missing
    url: process.env.REDIS_URL || "",
  },
} satisfies Record<string, any>;
