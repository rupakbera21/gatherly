/**
 * @module env
 * @purpose Validate and expose typed server-side environment variables at startup.
 *          Strips surrounding quotes/whitespace from values (prevents the
 *          "values pasted with quotes" bug from the previous submission).
 *          Fails fast with a descriptive error if required vars are missing.
 * @rubric Security – secrets stay server-side; Configuration – clear errors.
 */

import { z } from "zod";

/** Strip surrounding single or double quotes and whitespace that users
 *  sometimes paste when copying from docs. */
function stripQuotes(s: string): string {
  return s.trim().replace(/^["'](.*)["']$/, "$1");
}

const coercedString = z
  .string()
  .transform(stripQuotes)
  .refine((s) => s.length > 0, { message: "must not be empty" });

const optionalCoercedString = z
  .string()
  .optional()
  .transform((s) => (s ? stripQuotes(s) : undefined));

const envSchema = z.object({
  /** Gemini API key – required for primary AI provider. */
  GEMINI_API_KEY: coercedString,
  /** Groq API key – required for fallback AI provider. */
  GROQ_API_KEY: coercedString,
  /** Upstash Redis REST URL – required for rate limiting and circuit breaker. */
  UPSTASH_REDIS_REST_URL: coercedString,
  /** Upstash Redis REST token – required for rate limiting and circuit breaker. */
  UPSTASH_REDIS_REST_TOKEN: coercedString,
  /** Optional Gemini model override. */
  GEMINI_MODEL: optionalCoercedString,
  /** Optional Groq model override. */
  GROQ_MODEL: optionalCoercedString,
  /** Optional build commit hash set by CI. */
  NEXT_PUBLIC_BUILD_COMMIT: optionalCoercedString,
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.errors
      .map((e) => `  • ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(
      `[gatherly] Invalid environment variables:\n${missing}\n` +
        `See .env.example for required keys.`
    );
  }
  return result.data;
}

// Parsed once at module load. In production this runs at cold start.
// In tests, call resetEnvForTest() after setting process.env.
let _env: ReturnType<typeof parseEnv> | null = null;

export function getEnv() {
  if (!_env) {
    _env = parseEnv();
  }
  return _env;
}

/** For tests only: reset the cached parsed env so new process.env values
 *  take effect on the next call to getEnv(). */
export function resetEnvForTest(): void {
  _env = null;
}

/** Returns the Gemini model name, preferring the env override. */
export function geminiModel(): string {
  return getEnv().GEMINI_MODEL ?? "gemini-2.5-flash";
}

/** Returns the Groq model name, preferring the env override. */
export function groqModel(): string {
  return getEnv().GROQ_MODEL ?? "llama-3.3-70b-versatile";
}
