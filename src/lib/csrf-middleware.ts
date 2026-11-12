/**
 * CSRF middleware wrapper
 *
 * Wraps API route handlers to validate CSRF tokens on state-changing methods
 * (POST, PUT, PATCH, DELETE). GET, HEAD, OPTIONS are exempt.
 */

import { NextResponse } from "next/server";
import {
  getCsrfTokenFromCookies,
  validateCsrfToken,
  CSRF_HEADER_NAME,
} from "@/lib/csrf";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function withCsrfProtection(
  handler: (request: Request) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    // Skip CSRF for safe methods
    if (!STATE_CHANGING_METHODS.has(request.method)) {
      return handler(request);
    }

    const cookieToken = await getCsrfTokenFromCookies();
    const validation = validateCsrfToken(request.headers, cookieToken);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "CSRF validation failed" },
        { status: 403 },
      );
    }

    return handler(request);
  };
}

export { CSRF_HEADER_NAME };
