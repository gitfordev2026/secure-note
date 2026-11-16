export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { loginSchema } from "@/validations";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, getClientIdentifier, rateLimiters } from "@/lib/rate-limit";
import { createErrorResponse } from "@/lib/utils";
import { withCsrfProtection } from "@/lib/csrf-middleware";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";

async function handler(request: Request): Promise<Response> {
  try {
    // Rate limiting by IP
    const identifier = getClientIdentifier(request, "/api/auth/login");
    const rateLimit = checkRateLimit(identifier, rateLimiters.auth);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later.", retryAfter: rateLimit.retryAfter },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: first ? (first as any).message : "Invalid input" },
        { status: 400 },
      );
    }

    const { email, password, rememberMe } = parsed.data;

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Check if account is locked
    if (user && user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const retryAfter = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Account temporarily locked due to too many failed attempts. Please try again later.", retryAfter },
        { status: 429 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "disabled") {
      return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
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
      const MAX_FAILED_ATTEMPTS = 5;
      const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await db.update(users).set(updates).where(eq(users.id, user.id));

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        return NextResponse.json(
          { error: "Too many failed attempts. Account locked for 15 minutes.", retryAfter: Math.ceil(LOCKOUT_DURATION_MS / 1000) },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Reset failed login attempts on successful login
    await db
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

    const cookieStore = await cookies();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    cookieStore.set("noteapp_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const redirectTo = user.role === "admin" ? "/admin" : "/dashboard";
    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    // Rotate CSRF token after successful auth
    const csrfToken = generateCsrfToken();
    setCsrfCookie(response, csrfToken);

    return response;
  } catch (e: any) {
    return createErrorResponse(e, 500);
  }
}

export const POST = withCsrfProtection(handler);
