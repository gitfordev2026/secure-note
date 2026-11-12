export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("noteapp_session")?.value;
    if (token) {
      await destroySession(
        { DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" },
        token
      );
    }
    const cookieStore = await cookies();
    cookieStore.set("noteapp_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Logout failed" }, { status: 500 });
  }
}
