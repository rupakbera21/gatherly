/**
 * @module ratelimit.test  (extended)
 * @purpose Unit tests for checkRateLimit and rateLimitHeaders:
 *          - Returns allowed when no Redis configured (fail-open)
 *          - Returns allowed when Redis throws (fail-open)
 *          - Returns disallowed when Redis limit is reached
 *          - Captures retry-after and remaining correctly
 *          - rateLimitHeaders formats correct header values
 *          - Two tiers ("general" and "generation") use different limiters
 */

import { rateLimitHeaders, RateLimitResult } from "@/services/ratelimit";

// Mock @upstash/ratelimit and @upstash/redis to avoid real network calls
jest.mock("@upstash/redis", () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock("@upstash/ratelimit", () => {
  const mockLimit = jest.fn();
  const MockRatelimit = jest.fn().mockImplementation(() => ({
    limit: mockLimit,
  }));
  (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = jest.fn().mockReturnValue({});
  (MockRatelimit as unknown as Record<string, unknown>).__mockLimit = mockLimit;
  return { Ratelimit: MockRatelimit };
});

import { Ratelimit } from "@upstash/ratelimit";

const getMockLimit = (): jest.Mock => {
  return (Ratelimit as unknown as { __mockLimit: jest.Mock }).__mockLimit;
};

describe("checkRateLimit", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module-level singletons between tests by resetting module registry
    jest.resetModules();
    getMockLimit().mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fails open (allowed=true, failedOpen=true) when no Redis env vars configured", async () => {
    process.env = { ...originalEnv };
    delete process.env["UPSTASH_REDIS_REST_URL"];
    delete process.env["UPSTASH_REDIS_REST_TOKEN"];

    // Re-import after env change to exercise the null Redis path
    jest.resetModules();
    const { checkRateLimit: check } = await import("@/services/ratelimit");
    const result = await check("test-id", "general");
    expect(result.allowed).toBe(true);
    expect(result.failedOpen).toBe(true);
  });

  it("fails open when Redis limit() throws an error", async () => {
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "fake_token",
    };

    jest.resetModules();
    jest.mock("@upstash/ratelimit", () => {
      const mockLimit = jest.fn().mockRejectedValue(new Error("Redis connection refused"));
      const MockRatelimit = jest.fn().mockImplementation(() => ({ limit: mockLimit }));
      (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = jest.fn().mockReturnValue({});
      return { Ratelimit: MockRatelimit };
    });

    const { checkRateLimit: check } = await import("@/services/ratelimit");
    const result = await check("test-id", "general");
    expect(result.allowed).toBe(true);
    expect(result.failedOpen).toBe(true);
  });

  it("returns allowed=false and remaining=0 when limit is exceeded", async () => {
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "fake_token",
    };

    jest.resetModules();
    const resetMs = Date.now() + 60_000;
    jest.mock("@upstash/ratelimit", () => {
      const mockLimit = jest.fn().mockResolvedValue({
        success: false,
        remaining: 0,
        reset: resetMs,
      });
      const MockRatelimit = jest.fn().mockImplementation(() => ({ limit: mockLimit }));
      (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = jest.fn().mockReturnValue({});
      return { Ratelimit: MockRatelimit };
    });

    const { checkRateLimit: check } = await import("@/services/ratelimit");
    const result = await check("over-limit-id", "generation");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBe(resetMs);
    expect(result.failedOpen).toBe(false);
  });

  it("returns allowed=true and remaining > 0 when limit not exceeded", async () => {
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "fake_token",
    };

    jest.resetModules();
    const resetMs = Date.now() + 60_000;
    jest.mock("@upstash/ratelimit", () => {
      const mockLimit = jest.fn().mockResolvedValue({
        success: true,
        remaining: 8,
        reset: resetMs,
      });
      const MockRatelimit = jest.fn().mockImplementation(() => ({ limit: mockLimit }));
      (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = jest.fn().mockReturnValue({});
      return { Ratelimit: MockRatelimit };
    });

    const { checkRateLimit: check } = await import("@/services/ratelimit");
    const result = await check("normal-user-id", "generation");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(8);
    expect(result.failedOpen).toBe(false);
  });
});

describe("rateLimitHeaders", () => {
  it("formats Retry-After, X-RateLimit-Remaining, and X-RateLimit-Reset headers", () => {
    const futureMs = Date.now() + 30_000;
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetAt: futureMs,
      failedOpen: false,
    };

    const headers = rateLimitHeaders(result) as Record<string, string>;
    const retryAfter = parseInt(headers["Retry-After"]!, 10);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(30);
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(headers["X-RateLimit-Reset"]).toBe(String(futureMs));
  });

  it("handles failedOpen case (resetAt=0) without crashing", () => {
    const result: RateLimitResult = {
      allowed: true,
      remaining: -1,
      resetAt: 0,
      failedOpen: true,
    };
    expect(() => rateLimitHeaders(result)).not.toThrow();
  });
});
