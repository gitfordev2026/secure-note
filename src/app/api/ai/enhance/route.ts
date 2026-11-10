export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { enhanceNote } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const env = {
      AI: (process.env as any).AI,
      DB: (process.env as any).DB,
    };

    const result = await enhanceNote(content, env);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "AI enhancement failed" }, { status: 500 });
  }
}
