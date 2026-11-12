export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { createDb } from "@/db/connection";
import { notes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { noteSchema } from "@/validations";
import { sanitizeNoteContent } from "@/lib/sanitize";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [note] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id))).limit(1);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ note: { ...note, content: sanitizeNoteContent(note.content) } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const parsed = noteSchema.partial().safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json({ error: first ? (first as any).message : "Invalid input" }, { status: 400 });
    }

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [existing] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id))).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const updateData: any = { ...parsed.data, updatedAt: new Date() };
    if (updateData.content) updateData.content = sanitizeNoteContent(updateData.content, true);
    if (updateData.tags && Array.isArray(updateData.tags)) updateData.tags = JSON.stringify(updateData.tags);

    const [note] = await db.update(notes).set(updateData).where(and(eq(notes.id, id), eq(notes.userId, user.id))).returning();
    return NextResponse.json({ success: true, note });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [existing] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id))).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unauthorized" }, { status: 401 });
  }
}
