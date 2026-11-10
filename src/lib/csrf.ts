/**
 * CSRF Protection
 *
 * Uses double-submit cookie pattern:
 * 1. Server sets a CSRF token cookie (not HTTP-only so JS can read it)
 * 2. Client includes the token in a custom header (X-CSRF-Token) on state-changing requests
 * 3. Server validates the header matches the cookie
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "noteapp_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

/** Generate a CSRF token */
export function generateCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Get the CSRF token from cookies */
export async function getCsrfTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/** Set the CSRF token cookie (called in middleware or API response) */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.headers.set(
    "Set-Cookie",
    `${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Lax; ${
      process.env.NODE_ENV === "production" ? "Secure; " : ""
    }HttpOnly; Max-Age=86400`,
  );
}

/** Validate CSRF token from request headers against cookie */
export function validateCsrfToken(
  requestHeaders: Headers,
  cookieToken: string | null,
): { valid: boolean; error?: string } {
  const headerToken = requestHeaders.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return { valid: false, error: "CSRF token missing" };
  }

  if (cookieToken !== headerToken) {
    return { valid: false, error: "CSRF token mismatch" };
  }

  return { valid: true };
}

export { CSRF_HEADER_NAME, CSRF_COOKIE_NAME };
