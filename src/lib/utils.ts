import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return formatDate(d);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "…";
}

/**
 * Sanitize search query to prevent SQL wildcard injection
 * Escapes % and _ characters used in SQL LIKE patterns
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return "";
  // Escape SQL LIKE wildcards: % (matches any sequence) and _ (matches single char)
  return query.replace(/[%_]/g, (match) => `\\${match}`);
}

/**
 * Sanitize search query for ILIKE patterns - returns the pattern with wildcards
 * Use this when building the ILIKE pattern: `%${sanitizeSearchQuery(query)}%`
 */
export function buildSearchPattern(query: string): string {
  const sanitized = sanitizeSearchQuery(query);
  return `%${sanitized}%`;
}

/**
 * Sanitize error responses to prevent information leakage
 * Returns a safe error message without internal details
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // In development, return the actual error message
    if (process.env.NODE_ENV === "development") {
      return error.message;
    }
    // In production, return generic messages
    const message = error.message.toLowerCase();
    if (message.includes("unauthorized") || message.includes("forbidden")) {
      return "Unauthorized";
    }
    if (message.includes("not found")) {
      return "Resource not found";
    }
    if (message.includes("validation") || message.includes("invalid")) {
      return "Invalid request";
    }
    if (message.includes("database") || message.includes("db") || message.includes("sql")) {
      return "Database error";
    }
    if (message.includes("csrf")) {
      return "Security validation failed";
    }
    return "Internal server error";
  }
  return "Internal server error";
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown, status = 500): Response {
  const message = sanitizeError(error);
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
