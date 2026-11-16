import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateSession, hashSessionToken } from "@/lib/auth";
import { createDb } from "@/db/connection";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Security headers for all responses
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  // Prevent MIME-type sniffing
  "X-Content-Type-Options": "nosniff",
  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Enable XSS filter in older browsers
  "X-XSS-Protection": "1; mode=block",
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://cdnjs.cloudflare.com https://unpkg.com data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  // Permissions policy - restrict sensitive browser features
  "Permissions-Policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "accelerometer=()",
    "gyroscope=()",
  ].join(", "),
};

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/notes/:path*",
    "/pinned/:path*",
    "/archived/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/:path*",
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

// Edge-compatible env for session validation
function getEnv() {
  return {
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  };
}

/**
 * Validates session token directly in middleware (edge-compatible)
 * Returns user object if valid, null if invalid/expired
 */
async function validateSessionEdge(token: string): Promise<{ user: any; needsRotation: boolean } | null> {
  try {
    const tokenHash = await hashSessionToken(token);
    const env = getEnv();
    const db = createDb(env);

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionTokenHash, tokenHash))
      .limit(1);

    if (!session) return null;

    const now = new Date();
    const expiresAt = new Date((session as any).expiresAt);
    if (expiresAt < now) {
      // Expired — clean up
      await db.delete(sessions).where(eq(sessions.id, (session as any).id));
      return null;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, (session as any).userId))
      .limit(1);

    if (!user) return null;
    if ((user as any).status === "disabled") {
      await db.delete(sessions).where(eq(sessions.id, (session as any).id));
      return null;
    }

    // Determine if token needs rotation (older than 15 min)
    const createdAt = new Date((session as any).createdAt);
    const needsRotation = now.getTime() - createdAt.getTime() > 15 * 60 * 1000;

    return { user: user as any, needsRotation };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get("noteapp_session")?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  const isAuthRoute = AUTH_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  // Apply security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // No token - redirect protected routes to login
  if (!token) {
    if (isProtected) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Validate session token against database
  const validation = await validateSessionEdge(token);

  if (!validation) {
    // Invalid/expired session - clear cookie and redirect
    if (isProtected) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.set("noteapp_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value);
      });
      return redirectResponse;
    }
    // For non-protected routes, just clear cookie
    response.cookies.set("noteapp_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  // Valid session - redirect auth routes to dashboard
  if (isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // TODO: Implement token rotation in a server action (middleware can't set cookies on response easily)
  // The rotation will be handled by server actions on next request

  return response;
}
