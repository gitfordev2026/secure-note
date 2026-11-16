import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, asc, sql, ilike, or, count, inArray } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";

import { users, notes, sessions, auditLogs } from "./schema";
import type {
  User,
  Note,
  Session,
  AuditLog,
  NoteWithUser,
  PaginationMeta,
  Env,
} from "@/types";

// Create a Drizzle instance bound to a D1 database
export function createDb(env: Env) {
  if (!env.DB) {
    throw new Error(
      "D1 database binding (env.DB) is not available. " +
      "To develop locally, run: npx wrangler pages dev . --port 3080 " +
      "(This injects Cloudflare bindings including D1. " +
      "Do NOT use 'next dev' directly as it doesn't provide D1 bindings.)"
    );
  }
  return drizzle(env.DB as any);
}

// Re-export commonly used query builders for convenience
export { eq, and, desc, asc, sql, ilike, or, count, inArray };

export type DB = ReturnType<typeof createDb>;
