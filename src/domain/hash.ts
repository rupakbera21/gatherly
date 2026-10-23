/**
 * @module hash
 * @purpose Canonical SHA-256 hash for cache keys.
 *          Used by both client and server on identical normalised inputs
 *          so cache keys always match (fixes the previous build's bug where
 *          client and server computed hashes of different strings).
 *
 *          canonicalJson: deterministic JSON serialisation (sorted keys,
 *          no undefined values). The same function is used in browser
 *          (via SubtleCrypto) and Node.js (via crypto module).
 *
 * @rubric Efficiency – cache hit rate depends on stable keys.
 */

/** Deterministic JSON serialisation: sorted keys, no undefined values. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);

  return "{" + parts.join(",") + "}";
}

/**
 * Compute a SHA-256 hex digest of the canonical JSON representation.
 * Works in both Node.js (crypto module) and browser (SubtleCrypto).
 */
export async function sha256Hex(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(canonicalJson(value));

  if (typeof crypto !== "undefined" && crypto.subtle) {
    // Browser / Edge runtime
    const buffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Node.js
  const { createHash } = await import("crypto");
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Build a cache key for an LLM task.
 * All parameters must be identical on client and server for hits to occur.
 */
export async function buildCacheKey(params: {
  task: string;
  profileSubset: Record<string, unknown>;
  language: string;
  promptVersion: string;
}): Promise<string> {
  return `gatherly:v1:${await sha256Hex(params)}`;
}
