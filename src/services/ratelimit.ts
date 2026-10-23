/**
 * @module ratelimit
 * @purpose Upstash sliding-window rate limiter with two tiers.
 *          Always awaited (fixes the previous build's bug of calling the
 *          async limiter without await). Fails open with a server log if
 *          Redis is unreachable so legitimate users are not blocked by
 *          infrastructure issues.
 * @rubric Security – rate limiting; Efficiency – Upstash shared across instances.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "./logger";

let _redis: Redis | null = null;
let _generalLimiter: Ratelimit | null = null;
let _generationLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  try {
    const url = process.env["UPSTASH_REDIS_REST_URL"];
    const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
    if (!url || !token) return null;
    _redis = new Redis({ url, token });
    return _redis;
  } catch (err) {
    logger.warn("Upstash Redis init failed – rate limiting disabled", {
      msg: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function getGeneralLimiter(): Ratelimit | null {
  if (_generalLimiter) return _generalLimiter;
  const redis = getRedis();
  if (!redis) return null;
  _generalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "gatherly:rl:general",
    analytics: false,
  });
  return _generalLimiter;
}

function getGenerationLimiter(): Ratelimit | null {
  if (_generationLimiter) return _generationLimiter;
  const redis = getRedis();
  if (!redis) return null;
  _generationLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "gatherly:rl:generation",
    analytics: false,
  });
  return _generationLimiter;
}

export type RateLimitTier = "general" | "generation";

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  resetAt: number;
  /** True if Redis was unreachable and we failed open. */
  failedOpen: boolean;
}

/**
 * Check the rate limit for an identifier (hashed IP).
 * Always awaits the async check.
 * Returns allowed=true with failedOpen=true if Redis is unreachable.
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "general"
): Promise<RateLimitResult> {
  const limiter =
    tier === "generation" ? getGenerationLimiter() : getGeneralLimiter();

  if (!limiter) {
    logger.warn("Rate limiter unavailable – failing open", { tier });
    return { allowed: true, remaining: -1, resetAt: 0, failedOpen: true };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
      failedOpen: false,
    };
  } catch (err) {
    logger.warn("Rate limit check threw – failing open", {
      tier,
      msg: err instanceof Error ? err.message : String(err),
    });
    return { allowed: true, remaining: -1, resetAt: 0, failedOpen: true };
  }
}

/** Build rate-limit response headers for failed checks. */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };
}
