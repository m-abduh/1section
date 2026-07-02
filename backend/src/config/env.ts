import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
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

  publicUrl: process.env.PUBLIC_URL || "http://localhost:4000",

  redis: {
    url: process.env.REDIS_URL || "",
  },
} as const;
