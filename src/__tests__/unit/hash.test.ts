/**
 * Tests for the canonical hash module.
 * Key property to verify: client and server compute identical cache keys
 * for identical inputs (fixes the previous build's cache miss bug).
 */

import { canonicalJson, sha256Hex, buildCacheKey } from "@/domain/hash";

describe("canonicalJson", () => {
  it("produces the same output regardless of key insertion order", () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("serialises primitives correctly", () => {
    expect(canonicalJson(42)).toBe("42");
    expect(canonicalJson("hello")).toBe('"hello"');
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(true)).toBe("true");
  });

  it("serialises arrays preserving order", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("excludes undefined values", () => {
    const obj = { a: 1, b: undefined, c: 3 };
    const result = canonicalJson(obj);
    expect(result).not.toContain("undefined");
    expect(result).toContain('"a":1');
    expect(result).toContain('"c":3');
  });

  it("handles nested objects", () => {
    const a = { x: { z: 1, a: 2 }, y: [1, 2] };
    const b = { y: [1, 2], x: { a: 2, z: 1 } };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("is stable – same input produces same output every time", () => {
    const input = { type: "wedding", guests: 120, budget: 500000 };
    const result1 = canonicalJson(input);
    const result2 = canonicalJson(input);
    expect(result1).toBe(result2);
  });
});

describe("sha256Hex", () => {
  it("produces a 64-char hex string", async () => {
    const hash = await sha256Hex({ test: "value" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces identical hashes for identical canonical inputs regardless of key order", async () => {
    const hashA = await sha256Hex({ z: 1, a: 2 });
    const hashB = await sha256Hex({ a: 2, z: 1 });
    expect(hashA).toBe(hashB);
  });

  it("produces different hashes for different inputs", async () => {
    const hashA = await sha256Hex({ task: "budget" });
    const hashB = await sha256Hex({ task: "timeline" });
    expect(hashA).not.toBe(hashB);
  });
});

describe("buildCacheKey", () => {
  const baseParams = {
    task: "budget",
    profileSubset: { type: "wedding", guestCount: 120 },
    language: "en",
    promptVersion: "v1",
  };

  it("returns a string starting with the gatherly prefix", async () => {
    const key = await buildCacheKey(baseParams);
    expect(key).toMatch(/^gatherly:v1:/);
  });

  it("produces the same key for the same inputs (client ↔ server match test)", async () => {
    // Simulates client and server computing identical keys for identical inputs
    const key1 = await buildCacheKey(baseParams);
    const key2 = await buildCacheKey({ ...baseParams });
    expect(key1).toBe(key2);
  });

  it("produces different keys for different tasks", async () => {
    const k1 = await buildCacheKey({ ...baseParams, task: "budget" });
    const k2 = await buildCacheKey({ ...baseParams, task: "timeline" });
    expect(k1).not.toBe(k2);
  });

  it("produces different keys for different prompt versions", async () => {
    const k1 = await buildCacheKey({ ...baseParams, promptVersion: "v1" });
    const k2 = await buildCacheKey({ ...baseParams, promptVersion: "v2" });
    expect(k1).not.toBe(k2);
  });

  it("is independent of profileSubset key insertion order", async () => {
    const k1 = await buildCacheKey({
      ...baseParams,
      profileSubset: { type: "wedding", guestCount: 120 },
    });
    const k2 = await buildCacheKey({
      ...baseParams,
      profileSubset: { guestCount: 120, type: "wedding" },
    });
    expect(k1).toBe(k2);
  });
});
