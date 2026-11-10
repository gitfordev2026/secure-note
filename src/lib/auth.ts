import bcrypt from "bcryptjs";
import { createDb } from "@/db/connection";
import { sessions, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Env, User, Session } from "@/types";

const SALT_ROUNDS = 12;

/** Hash a plaintext password with bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Verify a plaintext password against a hash. */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Generate a cryptographically secure session token. */
export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash a session token for storage. */
export async function hashSessionToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const bytes = Array.from(new Uint8Array(buf));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Create a session for a user and return the plain token + session row. */
export async function createSession(
  env: Env,
  userId: string,
): Promise<{ token: string; session: Session }> {
  const db = createDb(env);
  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      sessionTokenHash: tokenHash,
      expiresAt,
    })
    .returning();

  return { token, session: session as unknown as Session };
}

/** Validate a session token and return the user if valid. */
export async function validateSession(
  env: Env,
  token: string,
): Promise<{ user: User; session: Session } | null> {
  const tokenHash = await hashSessionToken(token);
  const db = createDb(env);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionTokenHash, tokenHash))
    .limit(1);

  if (!session) return null;

  const now = new Date();
  const expiresAt = new Date((session as any).expiresAt);
  if (expiresAt < now) {
    // Expired — clean up
    await db.delete(sessions).where(eq(sessions.id, (session as any).id));
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, (session as any).userId))
    .limit(1);

  if (!user) return null;
  if ((user as any).status === "disabled") {
    await db.delete(sessions).where(eq(sessions.id, (session as any).id));
    return null;
  }

  return {
    user: user as unknown as User,
    session: session as unknown as Session,
  };
}

/** Delete a session by token. */
export async function destroySession(env: Env, token: string): Promise<void> {
  const tokenHash = await hashSessionToken(token);
  const db = createDb(env);
  await db.delete(sessions).where(eq(sessions.sessionTokenHash, tokenHash));
}

/** Delete all sessions for a user. */
export async function destroyAllUserSessions(env: Env, userId: string) {
  const db = createDb(env);
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Get the current user from the request cookies (Next.js server). */
export async function getCurrentUser(env: Env): Promise<User | null> {
  // This is intended to be called within Next.js server actions/components
  // where `cookies()` is available. We accept the token as a parameter
  // from callers to keep this module framework-agnostic.
  return null;
}

export { getCurrentUser as getCurrentUserPlaceholder };
