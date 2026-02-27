/**
 * Environment configuration.
 *
 * Uses EXPO_PUBLIC_ prefixed variables which are inlined at build time.
 * For local development, create a .env file in mobile/ with the values.
 */

export const ENV = {
  API_URL:
    process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000",
  SUPABASE_URL:
    process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  WEB_APP_URL:
    process.env.EXPO_PUBLIC_WEB_APP_URL || "https://orpheus-theta.vercel.app",
} as const;
