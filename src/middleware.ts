import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get("noteapp_session")?.value;

  const PROTECTED_PREFIXES = [
    "/dashboard",
    "/notes",
    "/pinned",
    "/archived",
    "/settings",
    "/admin",
  ];
  const AUTH_PREFIXES = ["/auth/login", "/auth/signup", "/auth/forgot-password"];

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  const isAuthRoute = AUTH_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  // Route protection logic
  if (!token) {
    if (isProtected) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Apply security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
