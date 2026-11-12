export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { enhanceNote } from "@/lib/ai";
import type { Env } from "@/types";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const env: Env = {
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
      AI: (process.env as any).AI,
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
