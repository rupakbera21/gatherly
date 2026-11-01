/**
 * @module circuit-breaker.test
 * @purpose Unit tests for AI circuit breaker:
 *          - In-memory trip, check, expiry, and reset
 *          - Redis distributed sync and error tolerance
 */

import { isCircuitOpen, tripCircuit, resetCircuit } from "@/services/ai/circuit-breaker";

describe("AI Circuit Breaker", () => {
  beforeEach(async () => {
    await resetCircuit("gemini");
    await resetCircuit("groq");
  });

  it("is closed by default", async () => {
    const open = await isCircuitOpen("gemini");
    expect(open).toBe(false);
  });

  it("trips circuit and reports open until reset", async () => {
    await tripCircuit("gemini", 10);
    const open = await isCircuitOpen("gemini");
    expect(open).toBe(true);

    await resetCircuit("gemini");
    const openAfterReset = await isCircuitOpen("gemini");
    expect(openAfterReset).toBe(false);
  });

  it("handles provider independently", async () => {
    await tripCircuit("gemini", 10);
    expect(await isCircuitOpen("gemini")).toBe(true);
    expect(await isCircuitOpen("groq")).toBe(false);
  });

  it("handles Redis integration gracefully", async () => {
    const origUrl = process.env["UPSTASH_REDIS_REST_URL"];
    const origToken = process.env["UPSTASH_REDIS_REST_TOKEN"];
    process.env["UPSTASH_REDIS_REST_URL"] = "https://mock.upstash.io";
    process.env["UPSTASH_REDIS_REST_TOKEN"] = "mock-token";

    try {
      // Even if redis network fails, circuit breaker operates via memory
      await tripCircuit("groq", 5);
      expect(await isCircuitOpen("groq")).toBe(true);
    } finally {
      if (origUrl) process.env["UPSTASH_REDIS_REST_URL"] = origUrl;
      else delete process.env["UPSTASH_REDIS_REST_URL"];
      if (origToken) process.env["UPSTASH_REDIS_REST_TOKEN"] = origToken;
      else delete process.env["UPSTASH_REDIS_REST_TOKEN"];
    }
  });

  it("opens circuit after trip and closes automatically after TTL expiry", async () => {
    const originalDateNow = Date.now;
    let mockTime = 1000000;
    Date.now = jest.fn(() => mockTime);

    try {
      await tripCircuit("gemini", 60);
      expect(await isCircuitOpen("gemini")).toBe(true);

      // Advance clock by 61 seconds
      mockTime += 61_000;
      expect(await isCircuitOpen("gemini")).toBe(false);
    } finally {
      Date.now = originalDateNow;
    }
  });
});
