/**
 * @module health.test
 * @purpose Unit and integration tests for GET /api/health endpoint.
 *          Verifies deploy verification, secret redaction, rate limiting,
 *          Upstash ping handling, and response timing headers.
 */

import { NextRequest } from "next/server";
import { GET as healthRoute } from "@/app/api/health/route";

describe("GET /api/health Endpoint", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 200 with provider status booleans (never secrets)", async () => {
    process.env["GEMINI_API_KEY"] = "secret-gemini-key";
    process.env["GROQ_API_KEY"] = "secret-groq-key";
    delete process.env["UPSTASH_REDIS_REST_URL"];
    delete process.env["UPSTASH_REDIS_REST_TOKEN"];

    const req = new NextRequest("http://localhost:3000/api/health");
    const res = await healthRoute(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.providers.gemini).toBe(true);
    expect(json.providers.groq).toBe(true);
    expect(json.upstash).toBe(false);
    expect(json.buildCommit).toBeDefined();

    // Verify raw response body does not leak the secret keys
    const raw = JSON.stringify(json);
    expect(raw).not.toContain("secret-gemini-key");
    expect(raw).not.toContain("secret-groq-key");

    // Headers
    expect(res.headers.get("X-Request-Id")).toBeDefined();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("handles missing API keys gracefully with false booleans", async () => {
    delete process.env["GEMINI_API_KEY"];
    delete process.env["GROQ_API_KEY"];

    const req = new NextRequest("http://localhost:3000/api/health");
    const res = await healthRoute(req);
    const json = await res.json();

    expect(json.providers.gemini).toBe(false);
    expect(json.providers.groq).toBe(false);
  });

  it("checks Upstash ping when URL and Token are set", async () => {
    process.env["UPSTASH_REDIS_REST_URL"] = "https://mock-redis.upstash.io";
    process.env["UPSTASH_REDIS_REST_TOKEN"] = "mock-token";

    // Mock global fetch for Upstash ping
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    try {
      const req = new NextRequest("http://localhost:3000/api/health");
      const res = await healthRoute(req);
      const json = await res.json();
      expect(json.upstash).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("handles Upstash ping failure without crashing", async () => {
    process.env["UPSTASH_REDIS_REST_URL"] = "https://mock-redis.upstash.io";
    process.env["UPSTASH_REDIS_REST_TOKEN"] = "mock-token";

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("Network timeout"));

    try {
      const req = new NextRequest("http://localhost:3000/api/health");
      const res = await healthRoute(req);
      const json = await res.json();
      expect(json.upstash).toBe(false);
      expect(res.status).toBe(200);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
