/**
 * Tests for env validation: quote stripping, missing key detection,
 * and model name fallbacks.
 *
 * Uses jest.resetModules() + dynamic import to re-evaluate the module
 * with different process.env values (ESM-compatible, no require()).
 */

import { resetEnvForTest } from "@/services/env";

const requiredEnv = {
  GEMINI_API_KEY: "test-gemini-key",
  GROQ_API_KEY: "test-groq-key",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
};

describe("env validation", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    resetEnvForTest();
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    resetEnvForTest();
  });

  it("parses valid env vars without throwing", () => {
    Object.assign(process.env, requiredEnv);
    resetEnvForTest();
    // Import after setting env
    const { getEnv } = jest.requireActual<typeof import("@/services/env")>(
      "@/services/env"
    );
    expect(() => getEnv()).not.toThrow();
  });

  it("strips surrounding double quotes from values", () => {
    Object.assign(process.env, {
      ...requiredEnv,
      GEMINI_API_KEY: '"quoted-key"',
    });
    resetEnvForTest();
    const { getEnv } = jest.requireActual<typeof import("@/services/env")>(
      "@/services/env"
    );
    const env = getEnv();
    expect(env.GEMINI_API_KEY).toBe("quoted-key");
  });

  it("strips surrounding single quotes from values", () => {
    Object.assign(process.env, {
      ...requiredEnv,
      GROQ_API_KEY: "'single-quoted'",
    });
    resetEnvForTest();
    const { getEnv } = jest.requireActual<typeof import("@/services/env")>(
      "@/services/env"
    );
    const env = getEnv();
    expect(env.GROQ_API_KEY).toBe("single-quoted");
  });

  it("strips leading and trailing whitespace", () => {
    Object.assign(process.env, {
      ...requiredEnv,
      UPSTASH_REDIS_REST_TOKEN: "  token-with-spaces  ",
    });
    resetEnvForTest();
    const { getEnv } = jest.requireActual<typeof import("@/services/env")>(
      "@/services/env"
    );
    const env = getEnv();
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBe("token-with-spaces");
  });

  it("throws with a descriptive error when a required key is missing", () => {
    // Remove GEMINI_API_KEY from process.env
    delete process.env["GEMINI_API_KEY"];
    Object.assign(process.env, {
      GROQ_API_KEY: "test-groq-key",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    });
    resetEnvForTest();
    const { getEnv } = jest.requireActual<typeof import("@/services/env")>(
      "@/services/env"
    );
    expect(() => getEnv()).toThrow(/GEMINI_API_KEY/);
  });

  it("returns default Gemini model when override not set", () => {
    Object.assign(process.env, requiredEnv);
    delete process.env["GEMINI_MODEL"];
    resetEnvForTest();
    const { geminiModel } = jest.requireActual<typeof import("@/services/env")>(
      "@/services/env"
    );
    expect(geminiModel()).toBe("gemini-2.5-flash");
  });

  it("returns override Gemini model when set", () => {
    Object.assign(process.env, { ...requiredEnv, GEMINI_MODEL: "gemini-pro" });
    resetEnvForTest();
    const { geminiModel } = jest.requireActual<typeof import("@/services/env")>(
      "@/services/env"
    );
    expect(geminiModel()).toBe("gemini-pro");
  });

  it("returns default Groq model when override not set", () => {
    Object.assign(process.env, requiredEnv);
    delete process.env["GROQ_MODEL"];
    resetEnvForTest();
    const { groqModel } = jest.requireActual<typeof import("@/services/env")>(
      "@/services/env"
    );
    expect(groqModel()).toBe("qwen/qwen3.8-27b");
  });
});
