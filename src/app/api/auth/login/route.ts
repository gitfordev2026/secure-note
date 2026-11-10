export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { loginSchema } from "@/validations";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: first ? (first as any).message : "Invalid input" },
        { status: 400 }
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

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "disabled") {
      return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const { token } = await createSession(
      { DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" },
      user.id
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
    return NextResponse.json({ success: true, redirectTo, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Login failed" }, { status: 500 });
  }
}
