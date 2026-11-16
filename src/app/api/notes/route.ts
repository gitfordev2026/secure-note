export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { createDb } from "@/db/connection";
import { notes } from "@/db/schema";
import { eq, desc, and, or, ilike, count } from "drizzle-orm";
import { noteSchema, paginationSchema } from "@/validations";
import { sanitizeNoteContent } from "@/lib/sanitize";
import { buildSearchPattern, createErrorResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const archived = searchParams.get("archived") === "true";
    const pinnedOnly = searchParams.get("pinned") === "true";

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const offset = (page - 1) * pageSize;
    const conditions: any[] = [eq(notes.userId, user.id)];
    if (archived !== undefined) conditions.push(eq(notes.isArchived, archived));
    if (pinnedOnly) conditions.push(eq(notes.isPinned, true));
    if (category) conditions.push(eq(notes.category, category));
    if (search) {
      const pattern = buildSearchPattern(search);
      conditions.push(or(ilike(notes.title, pattern), ilike(notes.content, pattern)));
    }

    const allConditions = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [rows, totalRes] = await Promise.all([
      db.select().from(notes).where(allConditions).orderBy(desc(notes.isPinned), desc(notes.updatedAt)).limit(pageSize).offset(offset),
      db.select({ count: count() }).from(notes).where(allConditions),
    ]);

    const total = Number((totalRes[0] as any).count ?? 0);

    return NextResponse.json({
      notes: rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        content: sanitizeNoteContent(r.content),
        category: r.category,
        tags: r.tags ? JSON.parse(r.tags) : [],
        isPinned: Boolean(r.isPinned),
        isArchived: Boolean(r.isArchived),
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (e: any) {
    return createErrorResponse(e, 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json({ error: first ? (first as any).message : "Invalid input" }, { status: 400 });
    }

    const { title, content, category, tags, isPinned, isArchived } = parsed.data;
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [note] = await db.insert(notes).values({
      userId: user.id,
      title,
      content,
      category: category ?? null,
      tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
      isPinned: isPinned ?? false,
      isArchived: isArchived ?? false,
    }).returning();

    return NextResponse.json({ success: true, note });
  } catch (e: any) {
    return createErrorResponse(e, 401);
  }
}
