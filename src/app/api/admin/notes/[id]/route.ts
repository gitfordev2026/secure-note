export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createDb } from "@/db/connection";
import { notes, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

    const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const [owner] = await db.select().from(users).where(eq(users.id, note.userId)).limit(1);

    return NextResponse.json({
      note: {
        ...note,
        tags: note.tags ? JSON.parse(note.tags) : [],
        user: owner ? { id: owner.id, name: owner.name, email: owner.email } : { name: "Unknown", email: "—" },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [existing] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const updateData: any = { ...body, updatedAt: new Date() };
    if (updateData.tags && Array.isArray(updateData.tags)) updateData.tags = JSON.stringify(updateData.tags);

    const [note] = await db.update(notes).set(updateData).where(eq(notes.id, id)).returning();
    return NextResponse.json({ success: true, note });
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

    const [existing] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await db.delete(notes).where(eq(notes.id, id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}
