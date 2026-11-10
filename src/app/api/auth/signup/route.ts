export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { hashPassword, createSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { signupSchema } from "@/validations";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createRateLimiter, authConfig } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/csrf-middleware";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";

const rateLimiter = createRateLimiter((process.env as any).KV_RATE_LIMIT || null);

async function handler(request: Request): Promise<Response> {
  try {
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await rateLimiter.check(`signup:${ip}`, authConfig);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: first ? (first as any).message : "Invalid input" },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash, role: "user", status: "active" })
      .returning();

    const { token } = await createSession(
      { DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" },
      user.id,
    );

    const cookieStore = await cookies();
    cookieStore.set("noteapp_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });

    // Rotate CSRF token after successful auth
    const csrfToken = generateCsrfToken();
    setCsrfCookie(response, csrfToken);

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Signup failed" }, { status: 500 });
  }
}

export const POST = withCsrfProtection(handler);
