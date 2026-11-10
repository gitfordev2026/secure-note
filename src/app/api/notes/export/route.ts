export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { createDb } from "@/db/connection";
import { notes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { exportNotes, getExportFilename, type ExportFormat } from "@/lib/export";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json") as ExportFormat;

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const allNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, user.id))
      .orderBy(desc(notes.updatedAt));

    const content = exportNotes(allNotes, format);
    const filename = getExportFilename(format);

    const contentTypeMap: Record<ExportFormat, string> = {
      json: "application/json",
      markdown: "text/markdown",
      text: "text/plain",
    };

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentTypeMap[format],
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Export failed" }, { status: 500 });
  }
}
