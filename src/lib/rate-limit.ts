/**
 * Rate limiting utility for Cloudflare Pages/Workers
 * Uses in-memory store with periodic cleanup (suitable for single-instance Workers)
 * For production multi-instance, consider Cloudflare KV or Upstash Redis
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockExpires?: number;
}

// In-memory store (persists within Worker instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval - remove expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now && (!entry.blockExpires || entry.blockExpires < now)) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Block duration after exceeding limit (optional) */
  blockDurationMs?: number;
  /** Custom key prefix */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked?: boolean;
  retryAfter?: number;
}

/**
 * Check and increment rate limit for a key
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.keyPrefix || "rl"}:${identifier}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Check if currently blocked
  if (entry?.blocked && entry.blockExpires && entry.blockExpires > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockExpires,
      blocked: true,
      retryAfter: Math.ceil((entry.blockExpires - now) / 1000),
    };
  }

  // Reset window if expired
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Increment counter
  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  // Check if exceeded
  if (entry.count > config.maxRequests) {
    const blockDuration = config.blockDurationMs || config.windowMs;
    const blockExpires = now + blockDuration;

    entry.blocked = true;
    entry.blockExpires = blockExpires;

    return {
      allowed: false,
      remaining: 0,
      resetTime: blockExpires,
      blocked: true,
      retryAfter: Math.ceil(blockDuration / 1000),
    };
  }

  // Update entry
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request (IP + optional path)
 */
export function getClientIdentifier(request: Request, path?: string): string {
  // Try to get real IP from headers (Cloudflare sets these)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip = cfConnectingIp || realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";

  return path ? `${ip}:${path}` : ip;
}

/**
 * Pre-configured rate limiters for common endpoints
 */
export const rateLimiters = {
  // Strict: 5 requests per minute for login/signup
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 15 * 60 * 1000, // 15 min block
    keyPrefix: "auth",
  },
  // Moderate: 30 requests per minute for general API
  api: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    keyPrefix: "api",
  },
  // Lenient: 100 requests per minute for static assets
  static: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: "static",
  },
} as const;

/**
 * Apply rate limit and return error response if blocked
 */
export function applyRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; response?: Response } {
  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    const response = new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || Math.ceil(config.windowMs / 1000)),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
        },
      }
    );
    return { success: false, response };
  }

  return { success: true };
}