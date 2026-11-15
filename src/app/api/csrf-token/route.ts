export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";

export async function GET() {
  try {
    const token = generateCsrfToken();
    const response = NextResponse.json({ success: true, csrfToken: token });
    setCsrfCookie(response, token);
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to generate CSRF token" }, { status: 500 });
  }
}
