export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createDb } from "@/db/connection";
import { auditLogs, users } from "@/db/schema";
import { desc, count, eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const offset = (page - 1) * pageSize;

    const [rows, totalRes] = await Promise.all([
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(pageSize).offset(offset),
      db.select({ count: count() }).from(auditLogs),
    ]);

    const total = Number((totalRes[0] as any).count ?? 0);

    return NextResponse.json({
      logs: rows.map((r: any) => ({
        id: r.id,
        adminId: r.adminId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        details: r.details ? JSON.parse(r.details) : null,
        createdAt: r.createdAt,
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
