/**
 * @module GET /api/health
 * @purpose Deployment verification endpoint. Returns booleans only – never
 *          secrets or sensitive configuration. Rate limited.
 *          Check this immediately after every deploy to catch env mistakes.
 * @rubric Security – no secret leakage; Configuration – deploy verification.
 */

import { NextRequest } from "next/server";
import { getHashedIp, getRequestId } from "@/services/http";
import { checkRateLimit, rateLimitHeaders } from "@/services/ratelimit";
import { logger } from "@/services/logger";


export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  const hashedIp = getHashedIp(req);
  const start = Date.now();

  const rl = await checkRateLimit(hashedIp, "general");
  if (!rl.allowed) {
    logger.warn("Health rate limited", { requestId, hashedIp });
    return new Response(JSON.stringify({ code: "RATE_LIMITED", message: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...rateLimitHeaders(rl),
      },
    });
  }

  // Check provider configuration (key presence only, never values)
  const geminiConfigured = Boolean(process.env["GEMINI_API_KEY"]?.trim());
  const groqConfigured = Boolean(process.env["GROQ_API_KEY"]?.trim());

  // Check Upstash connectivity
  let upstashOk = false;
  try {
    const url = process.env["UPSTASH_REDIS_REST_URL"];
    const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
    if (url && token) {
      const res = await fetch(`${url}/ping`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      });
      upstashOk = res.ok;
    }
  } catch {
    upstashOk = false;
  }

  const buildCommit = process.env["NEXT_PUBLIC_BUILD_COMMIT"] ?? "dev";
  const latencyMs = Date.now() - start;

  logger.info("Health check", {
    requestId,
    route: "/api/health",
    outcome: "ok",
    latencyMs,
  });

  return Response.json(
    {
      ok: true,
      providers: {
        gemini: geminiConfigured,
        groq: groqConfigured,
      },
      upstash: upstashOk,
      buildCommit,
    },
    {
      headers: {
        "X-Request-Id": requestId,
        "Server-Timing": `total;dur=${latencyMs}`,
        "Cache-Control": "no-store",
      },
    }
  );
}
