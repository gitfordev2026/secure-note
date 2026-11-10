export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { userRoleSchema, userStatusSchema } from "@/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
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
    await requireAdmin();
    const { id } = await params;
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}
