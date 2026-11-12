export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createDb } from "@/db/connection";
import { users, notes } from "@/db/schema";
import { count, eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalNotes] = await db.select({ count: count() }).from(notes);
    const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.status, "active"));

    const recentUsers = await db.select().from(users).orderBy(eq(users.createdAt, users.createdAt)).limit(5);
    const recentNotes = await db.select().from(notes).orderBy(eq(notes.createdAt, notes.createdAt)).limit(5);

    return NextResponse.json({
      totalUsers: Number((totalUsers as any).count ?? 0),
      totalNotes: Number((totalNotes as any).count ?? 0),
      activeUsers: Number((activeUsers as any).count ?? 0),
      recentUsers: recentUsers.map((r: any) => ({ id: r.id, name: r.name, email: r.email, createdAt: r.createdAt })),
      recentNotes: recentNotes.map((r: any) => ({ id: r.id, title: r.title, userId: r.userId, createdAt: r.createdAt })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
