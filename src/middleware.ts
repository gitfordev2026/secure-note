import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route protection middleware for NoteApp.
// Gates cookie-protected routes; full session validation happens in server actions.

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/notes/:path*",
    "/pinned/:path*",
    "/archived/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/notes",
  "/pinned",
  "/archived",
  "/settings",
  "/admin",
];

const AUTH_PREFIXES = ["/auth/login", "/auth/signup", "/auth/forgot-password"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get("noteapp_session")?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  const isAuthRoute = AUTH_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!token) {
    if (isProtected) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Authenticated user on auth pages → dashboard
  if (isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
