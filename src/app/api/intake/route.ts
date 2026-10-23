/**
 * @module POST /api/intake
 * @purpose Natural-language event intake endpoint.
 *          Extracts structured EventProfile from free-text descriptions.
 *          Rate-limited (generation tier), bounded request size (32KB),
 *          and prompt-injection defended.
 * @rubric GenAI Architecture – Intake extraction pipeline.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { AIOrchestrator } from "@/services/ai/orchestrator";
import {
  buildIntakePrompt,
  IntakeResultSchema,
} from "@/services/ai/prompts/intake";
import {
  apiError,
  apiSuccess,
  formatZodError,
  getHashedIp,
  getRequestId,
  readJsonBodyWithLimit,
} from "@/services/http";
import { logger } from "@/services/logger";
import { checkRateLimit, rateLimitHeaders } from "@/services/ratelimit";

const IntakeRequestSchema = z.object({
  description: z.string().min(5).max(2000),
  defaultCurrency: z.string().length(3).toUpperCase().optional(),
  language: z.string().max(10).optional(),
});

const orchestrator = new AIOrchestrator();

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const hashedIp = getHashedIp(req);
  const start = Date.now();

  // 1. Rate limiting (generation tier: 10/min)
  const rl = await checkRateLimit(hashedIp, "generation");
  if (!rl.allowed) {
    logger.warn("Intake rate limited", { requestId, hashedIp });
    return new Response(
      JSON.stringify({
        code: "RATE_LIMITED",
        message: "Too many generation requests. Please wait a moment before trying again.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimitHeaders(rl),
        },
      }
    );
  }

  // 2. Read bounded request body (32 KB cap)
  let rawBody: unknown;
  try {
    rawBody = await readJsonBodyWithLimit(req, 32 * 1024);
  } catch (err: unknown) {
    if (err instanceof Response) {
      return err;
    }
    return apiError("INVALID_JSON", "Could not parse JSON body.");
  }

  // 3. Validate input schema
  const parsed = IntakeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid intake request parameters.",
      formatZodError(parsed.error)
    );
  }

  const { description, defaultCurrency, language } = parsed.data;

  // 4. Run through AI orchestrator
  try {
    const prompt = buildIntakePrompt({
      rawDescription: description,
      defaultCurrency,
      language,
    });

    const result = await orchestrator.execute({
      task: "parse-intake",
      schema: IntakeResultSchema,
      prompt,
      language: language || "en",
    });

    const duration = Date.now() - start;
    logger.info("Intake parsed successfully", {
      requestId,
      provider: result.provider,
      cached: result.cached,
      durationMs: duration,
    });

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const eventProfile = {
      id: eventId,
      ...result.data,
      language: language || "en",
    };

    return apiSuccess(
      {
        profile: eventProfile,
        provider: result.provider,
        cached: result.cached,
      },
      {
        headers: {
          "Server-Timing": `ai;dur=${result.latencyMs}, total;dur=${duration}`,
          "X-Request-Id": requestId,
          ...rateLimitHeaders(rl),
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Intake extraction failed", { requestId, err: message });

    return apiError(
      "PROVIDER_ERROR",
      "Unable to extract event details. Please verify your event description and try again."
    );
  }
}
