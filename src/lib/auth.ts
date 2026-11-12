import bcrypt from "bcryptjs";
import { createDb } from "@/db/connection";
import { sessions, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Env, User, Session } from "@/types";

const SALT_ROUNDS = 12;

// Session security constants
const MAX_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_ROTATION_THRESHOLD_MS = 15 * 60 * 1000; // Rotate token if older than 15 min
const MAX_CONCURRENT_SESSIONS = 5; // Max active sessions per user

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

/** Enforce max concurrent sessions: delete oldest if at limit */
async function enforceMaxConcurrentSessions(
  db: any,
  userId: string,
): Promise<void> {
  const allSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));

  const sessionList = allSessions as any[];
  if (sessionList.length >= MAX_CONCURRENT_SESSIONS) {
    // Delete the oldest session(s) beyond the limit
    const toDelete = sessionList.slice(MAX_CONCURRENT_SESSIONS - 1);
    for (const s of toDelete) {
      await db.delete(sessions).where(eq(sessions.id, s.id));
    }
  }
}

/** Create a session for a user and return the plain token + session row. */
export async function createSession(
  env: Env,
  userId: string,
): Promise<{ token: string; session: Session }> {
  const db = createDb(env);

  // Enforce max concurrent sessions before creating new one
  await enforceMaxConcurrentSessions(db, userId);

  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + MAX_SESSION_DURATION_MS);

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
): Promise<{ user: User; session: Session; needsRotation: boolean } | null> {
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

  // Determine if token needs rotation (older than threshold)
  const createdAt = new Date((session as any).createdAt);
  const needsRotation = now.getTime() - createdAt.getTime() > SESSION_ROTATION_THRESHOLD_MS;

  return {
    user: user as unknown as User,
    session: session as unknown as Session,
    needsRotation,
  };
}

/** Rotate a session token: delete old, create new. Returns new token. */
export async function rotateSession(
  env: Env,
  oldToken: string,
): Promise<{ token: string; session: Session } | null> {
  const oldHash = await hashSessionToken(oldToken);
  const db = createDb(env);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionTokenHash, oldHash))
    .limit(1);

  if (!session) return null;

  const userId = (session as any).userId;

  // Delete old session
  await db.delete(sessions).where(eq(sessions.id, (session as any).id));

  // Create new session
  return createSession(env, userId);
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
