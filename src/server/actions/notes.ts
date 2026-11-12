"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { createDb } from "@/db/connection";
import { notes } from "@/db/schema";
import { eq, desc, asc, or, ilike, and, count, sql } from "drizzle-orm";
import { noteSchema, type NoteInput, paginationSchema } from "@/validations";
import type { PaginationMeta } from "@/types";

export interface NoteItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function parseNote(row: any): NoteItem {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : null,
    isPinned: Boolean(row.isPinned),
    isArchived: Boolean(row.isArchived),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

/** Create a new note for the authenticated user. */
export async function createNoteAction(input: NoteInput) {
  const user = await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return {
      error: first ? (first as any).message : "Invalid input",
    };
  }

  const { title, content, category, tags, isPinned, isArchived } = parsed.data;

  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [note] = await db
    .insert(notes)
    .values({
      userId: user.id,
      title,
      content,
      category: category ?? null,
      tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
      isPinned: isPinned ?? false,
      isArchived: isArchived ?? false,
    })
    .returning();

  revalidatePath("/notes");
  revalidatePath("/dashboard");
  revalidatePath("/pinned");
  revalidatePath("/archived");

  return { success: true, note: parseNote(note) };
}

/** Get all notes for the authenticated user with pagination and filters. */
export async function getNotesAction({
  page = 1,
  pageSize = 20,
  search,
  category,
  archived = false,
  pinnedOnly = false,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  archived?: boolean;
  pinnedOnly?: boolean;
}) {
  const user = await requireUser();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const offset = (page - 1) * pageSize;

  let query = db.select().from(notes).where(eq(notes.userId, user.id));

  // Build conditions
  const conditions = [eq(notes.userId, user.id)];
  if (archived !== undefined) {
    conditions.push(eq(notes.isArchived, archived));
  }
  if (pinnedOnly) {
    conditions.push(eq(notes.isPinned, true));
  }
  if (category) {
    conditions.push(eq(notes.category, category));
  }
  if (search) {
    conditions.push(((or as any)(ilike(notes.title, `%${search}%`), ilike(notes.content, `%${search}%`)) as any));
  }

  const allConditions = (and as any)(...(conditions as any[]));

  const [resultRows, totalResult] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(allConditions)
      .orderBy(
        desc(notes.isPinned),
        desc(notes.updatedAt),
      )
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(notes)
      .where(allConditions),
  ]);

  const total = Number((totalResult[0] as any).count ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  return {
    notes: resultRows.map(parseNote),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    } as PaginationMeta,
  };
}

/** Get a single note by ID (only if owned by the user). */
export async function getNoteByIdAction(id: string) {
  const user = await requireUser();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .limit(1);

  if (!note) return { error: "Note not found" };

  return { note: parseNote(note) };
}

/** Update a note (only if owned by the user). */
export async function updateNoteAction(id: string, input: Partial<NoteInput>) {
  const user = await requireUser();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  // Verify ownership
  const [existing] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .limit(1);

  if (!existing) return { error: "Note not found" };

  const parsed = noteSchema.partial().safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return {
      error: first ? (first as any).message ?? "Invalid input" : "Invalid input",
    };
  }

  const updateData: any = { ...parsed.data, updatedAt: new Date() };
  if (updateData.tags && Array.isArray(updateData.tags)) {
    updateData.tags = JSON.stringify(updateData.tags);
  }

  const [note] = await db
    .update(notes)
    .set(updateData)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .returning();

  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
  revalidatePath("/dashboard");

  return { success: true, note: parseNote(note) };
}

/** Delete a note (only if owned by the user). */
export async function deleteNoteAction(id: string) {
  const user = await requireUser();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [existing] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .limit(1);

  if (!existing) return { error: "Note not found" };

  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id)));

  revalidatePath("/notes");
  revalidatePath("/dashboard");
  revalidatePath("/pinned");
  revalidatePath("/archived");

  return { success: true };
}

/** Toggle pin status of a note. */
export async function togglePinNoteAction(id: string) {
  const user = await requireUser();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .limit(1);

  if (!note) return { error: "Note not found" };

  const isPinnedVal = Boolean(note.isPinned);
  const [updated] = await db
    .update(notes)
    .set({ isPinned: !isPinnedVal, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .returning();

  revalidatePath("/notes");
  revalidatePath("/pinned");
  revalidatePath("/dashboard");

  return { success: true, isPinned: Boolean(updated.isPinned) };
}

/** Get distinct categories for the user. */
export async function getCategoriesAction() {
  const user = await requireUser();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const rows = await db
    .selectDistinct({ category: notes.category })
    .from(notes)
    .where(
      and(eq(notes.userId, user.id), and(eq(notes.isArchived, false), sql`${notes.category} IS NOT NULL`)),
    );

  return rows.map((r) => r.category).filter(Boolean) as string[];
}

/** Get note stats for dashboard. */
export async function getNotesStatsAction() {
  const user = await requireUser();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [total] = await db
    .select({ count: count() })
    .from(notes)
    .where(eq(notes.userId, user.id));
  const [archivedCount] = await db
    .select({ count: count() })
    .from(notes)
    .where(and(eq(notes.userId, user.id), eq(notes.isArchived, true)));
  const [pinnedCount] = await db
    .select({ count: count() })
    .from(notes)
    .where(and(eq(notes.userId, user.id), eq(notes.isPinned, true)));

  return {
    total: Number((total as any).count ?? 0),
    archived: Number((archivedCount as any).count ?? 0),
    pinned: Number((pinnedCount as any).count ?? 0),
  };
}
