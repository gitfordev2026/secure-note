import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, asc, sql, ilike, or, count, inArray } from "drizzle-orm";

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
  return drizzle(env.DB as any);
}

// Re-export commonly used query builders for convenience
export { eq, and, desc, asc, sql, ilike, or, count, inArray };

export type DB = ReturnType<typeof createDb>;
