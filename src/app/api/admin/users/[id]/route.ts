export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { userRoleSchema, userStatusSchema } from "@/validations";
import { getCsrfTokenFromCookies, validateCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf";
import { validateSession } from "@/lib/auth";
import { count } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function validateCsrf(request: Request): Promise<NextResponse | null> {
  const cookieToken = await getCsrfTokenFromCookies();
  const validation = validateCsrfToken(request.headers, cookieToken);

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || "CSRF validation failed" },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // CSRF validation for state-changing operations
    const csrfError = await validateCsrf(request);
    if (csrfError) return csrfError;

    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    if (body.role !== undefined) {
      const parsed = userRoleSchema.safeParse({ role: body.role });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      await db.update(users).set({ role: body.role, updatedAt: new Date() }).where(eq(users.id, id));
    }

    if (body.status !== undefined) {
      const parsed = userStatusSchema.safeParse({ status: body.status });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      await db.update(users).set({ status: body.status, updatedAt: new Date() }).where(eq(users.id, id));
      if (body.status === "disabled") {
        const { sessions } = await import("@/db/schema");
        await db.delete(sessions).where(eq(sessions.userId, id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // CSRF validation for state-changing operations
    const csrfError = await validateCsrf(request);
    if (csrfError) return csrfError;

    await requireAdmin();
    const { id } = await params;
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    // Get the admin user from the session
    const cookieStore = await import("next/headers").then(m => m.cookies());
    const sessionToken = cookieStore.get("noteapp_session")?.value;

    if (sessionToken) {
      const validation = await validateSession(
        { DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" },
        sessionToken,
      );

      if (validation?.user) {
        const adminId = validation.user.id;

        // Prevent self-deletion
        if (adminId === id) {
          return NextResponse.json(
            { error: "You cannot delete your own account" },
            { status: 400 }
          );
        }

        // Prevent deleting the last admin
        const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (targetUser && targetUser.role === "admin") {
          const adminCount = await db.select({ count: count() }).from(users).where(eq(users.role, "admin"));
          const totalAdmins = Number((adminCount[0] as any).count ?? 0);

          if (totalAdmins <= 1) {
            return NextResponse.json(
              { error: "Cannot delete the last admin user" },
              { status: 400 }
            );
          }
        }
      }
    }

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}
