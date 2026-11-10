import { createDb } from "@/db/connection";

export { users, notes, sessions } from "@/db/schema";
export { createDb, eq, and, desc, asc, sql, ilike, or, count, inArray } from "@/db/connection";

export function db(env?: any) {
  return createDb({ DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" });
}
