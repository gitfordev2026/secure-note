"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { loginSchema, type LoginInput } from "@/validations";
import { verifyPassword, createSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookies";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, getClientIdentifier, rateLimiters } from "@/lib/rate-limit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function loginAction(formData: FormData) {
  // Rate limiting: 5 requests per minute per IP
  // Note: In Server Actions, we can't easily get the request object
  // For now, we use email as identifier (less ideal but functional)
  // Better approach: Use middleware or API route for rate limiting
  const email = formData.get("email") as string;
  if (email) {
    const rateLimitResult = checkRateLimit(email, rateLimiters.auth);
    if (!rateLimitResult.allowed) {
      return {
        error: "Too many login attempts. Please try again later.",
        retryAfter: rateLimitResult.retryAfter
      };
    }
  }

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return { error: first ? (first as any).message : "Invalid input" };
  }

  const { email: parsedEmail, password, rememberMe } = parsed.data;

  const dbInst = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [user] = await dbInst
    .select()
    .from(users)
    .where(eq(users.email, parsedEmail))
    .limit(1);

  // Always use same error message to prevent email enumeration
  if (!user) {
    return { error: "Invalid email or password" };
  }

  // Check if account is locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const retryAfter = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000);
    return {
      error: "Account temporarily locked due to too many failed attempts. Please try again later.",
      retryAfter
    };
  }

  if (user.status === "disabled") {
    return { error: "This account has been disabled. Contact support." };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    // Increment failed login attempts
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const updates: any = {
      failedLoginAttempts: newAttempts,
      updatedAt: new Date(),
    };

    // Lock account if max attempts reached
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }

    await dbInst
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id));

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      return {
        error: "Too many failed attempts. Account locked for 15 minutes.",
        retryAfter: Math.ceil(LOCKOUT_DURATION_MS / 1000)
      };
    }

    return { error: "Invalid email or password" };
  }

  // Reset failed login attempts on successful login
  await dbInst
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const { token } = await createSession(
    { DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" },
    user.id,
  );

  setSessionCookie(token, rememberMe);

  const redirectTo = (user.role === "admin" ? "/admin" : "/dashboard");
  redirect(redirectTo);
}
