/**
 * Rate limiting using Cloudflare KV (or in-memory fallback for local dev)
 *
 * Production: Set KV_RATE_LIMIT binding in wrangler.toml / Pages env
 * Local dev: Uses in-memory Map (resets on restart)
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for local development (resets on server restart)
const localStore = new Map<string, RateLimitEntry>();

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
};

const authConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute for auth endpoints
};

export { authConfig };

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = localStore;
  private kv: any = null;

  constructor(kv: any = null) {
    this.kv = kv;
  }

  private async getStore(key: string): Promise<RateLimitEntry | undefined> {
    if (this.kv) {
      try {
        const val = await this.kv.get(`rate_limit:${key}`, "json");
        return val as RateLimitEntry | undefined;
      } catch {
        return undefined;
      }
    }
    return this.store.get(key);
  }

  private async setStore(
    key: string,
    entry: RateLimitEntry,
  ): Promise<void> {
    if (this.kv) {
      try {
        await this.kv.put(`rate_limit:${key}`, JSON.stringify(entry), {
          expirationTtl: Math.ceil(entry.resetTime / 1000) - Math.floor(Date.now() / 1000) + 60,
        });
      } catch {
        // ignore KV errors in dev
      }
    } else {
      this.store.set(key, entry);
    }
  }

  async check(
    identifier: string,
    config: RateLimitConfig = defaultConfig,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const key = `rl:${identifier}`;
    const entry = await this.getStore(key);

    if (!entry || now > entry.resetTime) {
      // Start new window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      await this.setStore(key, newEntry);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count += 1;
    await this.setStore(key, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }
}

export function createRateLimiter(kv: any = null): RateLimiter {
  return new RateLimiter(kv);
}
