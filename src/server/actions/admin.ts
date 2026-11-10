"use server";

import { requireAdmin } from "@/server/auth";
import { createDb } from "@/db/connection";
import { users, notes, sessions, auditLogs } from "@/db/schema";
import { eq, desc, and, or, ilike, count, sql } from "drizzle-orm";
import { userRoleSchema, userStatusSchema, paginationSchema } from "@/validations";
import type { PaginationMeta } from "@/types";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "disabled";
  noteCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/** Get paginated list of users with note counts. */
export async function getAdminUsersAction({
  page = 1,
  pageSize = 20,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  await requireAdmin();
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

  // Get note counts per user
  const noteCounts = await db
    .select({ userId: notes.userId, count: count() })
    .from(notes)
    .groupBy(notes.userId);
  const noteCountMap = Object.fromEntries(
    noteCounts.map((r) => [r.userId, Number((r as any).count)]),
  );

  const total = Number((totalRes[0] as any).count ?? 0);

  return {
    users: rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      status: r.status,
      noteCount: noteCountMap[r.id] ?? 0,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      lastLoginAt: r.lastLoginAt ? new Date(r.lastLoginAt) : null,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } as PaginationMeta,
  };
}

/** Get a single admin user detail. */
export async function getAdminUserAction(id: string) {
  await requireAdmin();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return { error: "User not found" };

  const noteCount = await db
    .select({ count: count() })
    .from(notes)
    .where(eq(notes.userId, id));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      noteCount: Number((noteCount[0] as any).count ?? 0),
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
    },
  };
}

/** Update user role. */
export async function updateUserRoleAction(id: string, role: "user" | "admin") {
  await requireAdmin();
  const parsed = userRoleSchema.safeParse({ role });
  if (!parsed.success) return { error: "Invalid role" };

  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
  return { success: true };
}

/** Update user status (activate/deactivate). */
export async function updateUserStatusAction(id: string, status: "active" | "disabled") {
  await requireAdmin();
  const parsed = userStatusSchema.safeParse({ status });
  if (!parsed.success) return { error: "Invalid status" };

  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id));
  // If disabled, destroy sessions
  if (status === "disabled") {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }
  return { success: true };
}

/** Delete a user and their notes. */
export async function deleteUserAction(id: string) {
  await requireAdmin();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  await db.delete(users).where(eq(users.id, id));
  return { success: true };
}

export interface AdminNote {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; email: string };
}

/** Get all notes across all users for admin. */
export async function getAdminNotesAction({
  page = 1,
  pageSize = 20,
  search,
  userId,
  category,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  userId?: string;
  category?: string;
}) {
  await requireAdmin();
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

  return {
    notes: rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      tags: r.tags ? JSON.parse(r.tags) : [],
      isPinned: Boolean(r.isPinned),
      isArchived: Boolean(r.isArchived),
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      user: { id: r.userId, name: "", email: "" },
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } as PaginationMeta,
  };
}

/** Get audit logs. */
export async function getAuditLogsAction({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const offset = (page - 1) * pageSize;
  const [rows, totalRes] = await Promise.all([
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(auditLogs),
  ]);

  return {
    logs: rows.map((r: any) => ({
      id: r.id,
      adminId: r.adminId,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      details: r.details ? JSON.parse(r.details) : null,
      createdAt: new Date(r.createdAt),
    })),
    pagination: { page, pageSize, total: Number((totalRes[0] as any).count ?? 0), totalPages: Math.ceil(Number((totalRes[0] as any).count ?? 0) / pageSize) } as PaginationMeta,
  };
}

/** Get admin dashboard stats. */
export async function getAdminStatsAction() {
  await requireAdmin();
  const db = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalNotes] = await db.select({ count: count() }).from(notes);
  const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.status, "active"));
  const recentUsers = (await db.select().from(users).orderBy(desc(users.createdAt)).limit(5)) as any[];
  const recentNotes = (await db.select().from(notes).orderBy(desc(notes.createdAt)).limit(5)) as any[];

  return {
    totalUsers: Number((totalUsers as any).count ?? 0),
    totalNotes: Number((totalNotes as any).count ?? 0),
    activeUsers: Number((activeUsers as any).count ?? 0),
    recentUsers: recentUsers.map((r: any) => ({ id: r.id, name: r.name, email: r.email, createdAt: new Date(r.createdAt) })),
    recentNotes: recentNotes.map((r: any) => ({ id: r.id, title: r.title, userId: r.userId, createdAt: new Date(r.createdAt) })),
  };
}
