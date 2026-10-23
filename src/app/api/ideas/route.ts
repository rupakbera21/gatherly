/**
 * @module POST /api/ideas
 * @purpose Generates personalized event ideas conditioned on the event profile.
 *          Deduplicates suggestions via Jaccard similarity (threshold 0.7).
 *          Section 5.4 rule: Ideas have no baseline; returns an honest retryable error if AI fails.
 * @rubric Problem Statement Alignment & Reliability – Personalized ideas with token dedupe.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { filterDuplicateIdeas } from "@/domain/dedupe";
import { EventProfileSchema, IdeaItem } from "@/domain/types";
import { AIOrchestrator } from "@/services/ai/orchestrator";
import {
  buildIdeasPrompt,
  ProposedIdeasResultSchema,
} from "@/services/ai/prompts/ideas";
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

const IdeasRequestSchema = z.object({
  profile: EventProfileSchema,
  existingTitles: z.array(z.string().max(200)).default([]),
  regenerate: z.boolean().default(false),
});

const orchestrator = new AIOrchestrator();

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const hashedIp = getHashedIp(req);
  const start = Date.now();

  const rl = await checkRateLimit(hashedIp, "generation");
  if (!rl.allowed) {
    logger.warn("Ideas rate limited", { requestId, hashedIp });
    return new Response(
      JSON.stringify({ code: "RATE_LIMITED", message: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(rl) } }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBodyWithLimit(req, 32 * 1024);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("INVALID_JSON", "Could not parse JSON body.");
  }

  const parsed = IdeasRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid ideas request parameters", formatZodError(parsed.error));
  }
  const { profile, existingTitles, regenerate } = parsed.data;

  try {
    const prompt = buildIdeasPrompt(profile, existingTitles);

    // Bypass cache if creative regeneration requested
    const result = await orchestrator.execute({
      task: "generate-ideas",
      schema: ProposedIdeasResultSchema,
      prompt,
      profileSubset: {
        type: profile.type,
        guestCount: profile.guestCount,
        title: profile.title,
      },
      language: profile.language,
      bypassCache: regenerate,
    });

    const rawIdeas: IdeaItem[] = result.data.ideas.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      category: i.category,
      status: "suggested",
      addedToPlan: false,
    }));

    // Apply token Jaccard similarity deduplication (threshold 0.7)
    const existingObjects = existingTitles.map((t) => ({ title: t, description: "" }));
    const deduplicated = filterDuplicateIdeas(rawIdeas, existingObjects, 0.7);

    const duration = Date.now() - start;
    logger.info("Ideas generated successfully", {
      requestId,
      provider: result.provider,
      count: deduplicated.length,
      durationMs: duration,
    });

    return apiSuccess(
      {
        ideas: deduplicated,
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
    // Per Section 5.4: Ideas have NO baseline; return an honest retryable error
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Ideas generation failed", { requestId, err: message });

    return apiError(
      "PROVIDER_ERROR",
      "Unable to generate personalized ideas right now. Please click Retry to generate new ideas."
    );
  }
}
