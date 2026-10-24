#!/usr/bin/env node
/**
 * smoke.mjs – Manual smoke test script.
 * Run: npm run smoke
 *
 * Makes one tiny real call to each AI provider and to Upstash.
 * Prints pass/fail for each so credit or key problems are found
 * before the demo, not after.
 *
 * NOT run in CI (uses real API calls and real credits).
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local if it exists
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) {
      const k = key.trim();
      const value = rest.join("=").trim().replace(/^["'](.*)["']$/, "$1");
      if (process.env.NO_MODEL_OVERRIDES === "1" && (k === "GEMINI_MODEL" || k === "GROQ_MODEL")) {
        // Do not load model overrides from .env.local when verifying pure code defaults
        continue;
      }
      process.env[k] = value;
    }
  }
} catch {
  // .env.local not found – rely on real env
}

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`  ✅ ${name}: ${detail}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`  ❌ ${name}: ${detail}`);
}

async function smokeGemini() {
  const key = process.env.GEMINI_API_KEY?.trim().replace(/^["'](.*)["']$/, "$1");
  if (!key) return fail("Gemini", "GEMINI_API_KEY not set");

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Reply with the single word: ready" }] }],
        generationConfig: { maxOutputTokens: 100 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const body = await res.text();
      return fail("Gemini", `(${model}) HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    pass("Gemini", `(${model}) responded: "${text.trim().slice(0, 50)}"`);
  } catch (err) {
    fail("Gemini", `(${model}) ${err?.message ?? String(err)}`);
  }
}

async function smokeGroq() {
  const key = process.env.GROQ_API_KEY?.trim().replace(/^["'](.*)["']$/, "$1");
  if (!key) return fail("Groq", "GROQ_API_KEY not set");

  const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with the single word: ready" }],
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text();
      return fail("Groq", `(${model}) HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    pass("Groq", `(${model}) responded: "${text.trim().slice(0, 50)}"`);
  } catch (err) {
    fail("Groq", `(${model}) ${err?.message ?? String(err)}`);
  }
}

async function smokeUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/^["'](.*)["']$/, "$1");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim().replace(/^["'](.*)["']$/, "$1");

  if (!url || !token) return fail("Upstash", "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set");

  try {
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return fail("Upstash", `HTTP ${res.status}`);
    }
    const text = await res.text();
    pass("Upstash", `ping responded: ${text.trim().slice(0, 50)}`);
  } catch (err) {
    fail("Upstash", err?.message ?? String(err));
  }
}

async function main() {
  console.log("\n🔍 Gatherly Smoke Test\n");

  await smokeGemini();
  await smokeGroq();
  await smokeUpstash();

  const allPassed = results.every((r) => r.ok);
  console.log(
    `\n${allPassed ? "✅ All checks passed" : "❌ Some checks failed"}\n`
  );

  if (!allPassed) process.exit(1);
}

main().catch((err) => {
  console.error("Smoke test error:", err);
  process.exit(1);
});
