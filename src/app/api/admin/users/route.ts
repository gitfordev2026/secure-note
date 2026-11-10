export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createDb } from "@/db/connection";
import { users, notes, sessions } from "@/db/schema";
import { eq, and, or, ilike, count, desc } from "drizzle-orm";
import { userRoleSchema, userStatusSchema, paginationSchema } from "@/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/users - list users with optional search */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);
    const search = searchParams.get("search") || undefined;

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (search) {
      conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
    }
    const allConditions = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRes] = await Promise.all([
      db
        .select()
        .from(users)
        .where(allConditions)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(users).where(allConditions),
    ]);

    const noteCounts = await db
      .select({ userId: notes.userId, count: count() })
      .from(notes)
      .groupBy(notes.userId);
    const noteCountMap = Object.fromEntries(
      noteCounts.map((r) => [r.userId, Number((r as any).count)]),
    );

    const total = Number((totalRes[0] as any).count ?? 0);

    return NextResponse.json({
      users: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        status: r.status,
        noteCount: noteCountMap[r.id] ?? 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        lastLoginAt: r.lastLoginAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}

/** POST /api/admin/users - not used (users sign up themselves) */
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
