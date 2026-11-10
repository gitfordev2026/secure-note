export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // This endpoint validates the session cookie against D1
    // In production, this calls validateSession from lib/auth
    // For now, return no session; the client will redirect
    return NextResponse.json({ user: null });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
