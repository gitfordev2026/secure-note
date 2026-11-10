export const env = {
  SESSION_SECRET: process.env.SESSION_SECRET || "" || "dev-secret-change-me",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3080",
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME || "NoteApp",
  DB: (process.env as any).DB,
};

export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}
