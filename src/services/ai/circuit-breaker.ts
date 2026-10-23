/**
 * @module ai/circuit-breaker
 * @purpose Distributed circuit breaker for AI providers.
 *          Trips when a provider encounters quota or credit exhaustion,
 *          preventing useless retries for 60 seconds.
 *          Uses Upstash Redis for multi-instance agreement, failing open
 *          to in-memory state if Redis is offline.
 * @rubric Efficiency – Avoid waiting on known-dead providers.
 */

import { Redis } from "@upstash/redis";
import { logger } from "../logger";
import type { AIProviderName } from "./types";

let _redis: Redis | null = null;
const _localOpenUntil: Record<string, number> = {};

function getRedis(): Redis | null {
  if (_redis) return _redis;
  try {
    const url = process.env["UPSTASH_REDIS_REST_URL"];
    const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
    if (!url || !token) return null;
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    return null;
  }
}

/**
 * Check if the circuit breaker is open (provider temporarily unavailable).
 */
export async function isCircuitOpen(provider: AIProviderName): Promise<boolean> {
  const now = Date.now();
  // 1. Check local in-memory state first
  const localExpiry = _localOpenUntil[provider];
  if (localExpiry && localExpiry > now) {
    return true;
  }

  // 2. Check distributed Upstash Redis
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get(`gatherly:cb:${provider}`);
      if (val === "open") {
        // Sync local cache
        _localOpenUntil[provider] = now + 60_000;
        return true;
      }
    } catch (err) {
      logger.warn("Circuit breaker Redis check failed, using local memory", {
        provider,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return false;
}

/**
 * Trip the circuit breaker for a provider for ttlSeconds (default 60s).
 */
export async function tripCircuit(
  provider: AIProviderName,
  ttlSeconds = 60
): Promise<void> {
  const now = Date.now();
  _localOpenUntil[provider] = now + ttlSeconds * 1000;

  logger.warn(`Tripped circuit breaker for ${provider} for ${ttlSeconds}s`, {
    provider,
    ttlSeconds,
  });

  const redis = getRedis();
  if (redis) {
    try {
      await redis.setex(`gatherly:cb:${provider}`, ttlSeconds, "open");
    } catch (err) {
      logger.warn("Circuit breaker Redis set failed, kept in local memory only", {
        provider,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Reset the circuit breaker (e.g. for testing).
 */
export async function resetCircuit(provider: AIProviderName): Promise<void> {
  delete _localOpenUntil[provider];
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`gatherly:cb:${provider}`);
    } catch {
      // Ignore
    }
  }
}
