export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createDb } from "@/db/connection";
import { notes, users } from "@/db/schema";
import { eq, and, or, ilike, count, desc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);
    const search = searchParams.get("search") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const category = searchParams.get("category") || undefined;

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (userId) conditions.push(eq(notes.userId, userId));
    if (category) conditions.push(eq(notes.category, category));
    if (search) {
      conditions.push(or(ilike(notes.title, `%${search}%`), ilike(notes.content, `%${search}%`)));
    }
    const allConditions = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRes] = await Promise.all([
      db
        .select()
        .from(notes)
        .where(allConditions)
        .orderBy(desc(notes.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(notes).where(allConditions),
    ]);

    const total = Number((totalRes[0] as any).count ?? 0);

    // Fetch owner names
    const userIds = [...new Set(rows.map((r: any) => r.userId))];
    const ownerRows = await db.select().from(users).where(userIds.length ? eq(users.id, userIds[0]) : eq(users.id, "none"));
    // simpler: fetch all owners
    const allOwners = await db.select().from(users);
    const ownerMap = Object.fromEntries(allOwners.map((o: any) => [o.id, { name: o.name, email: o.email }]));

    return NextResponse.json({
      notes: rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        category: r.category,
        tags: r.tags ? JSON.parse(r.tags) : [],
        isPinned: Boolean(r.isPinned),
        isArchived: Boolean(r.isArchived),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: ownerMap[r.userId] || { name: "Unknown", email: "—" },
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
