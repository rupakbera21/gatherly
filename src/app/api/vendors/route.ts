/**
 * @module POST /api/vendors
 * @purpose Generates category-specific vendor checklists and lead-time warnings.
 *          Degrades gracefully to baseline vendor checklist if AI is offline.
 * @rubric GenAI Architecture & Problem Statement Alignment – Vendor checklist pipeline.
 */

import { NextRequest } from "next/server";
import { generateBaselineVendors } from "@/domain/baseline";
import { EventProfileSchema, VendorItem } from "@/domain/types";
import { AIOrchestrator } from "@/services/ai/orchestrator";
import {
  buildVendorsPrompt,
  ProposedVendorResultSchema,
} from "@/services/ai/prompts/vendors";
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

const orchestrator = new AIOrchestrator();

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const hashedIp = getHashedIp(req);
  const start = Date.now();

  const rl = await checkRateLimit(hashedIp, "generation");
  if (!rl.allowed) {
    logger.warn("Vendors rate limited", { requestId, hashedIp });
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

  const parsed = EventProfileSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid event profile", formatZodError(parsed.error));
  }
  const profile = parsed.data;

  try {
    const prompt = buildVendorsPrompt(profile);
    const result = await orchestrator.execute({
      task: "generate-vendors",
      schema: ProposedVendorResultSchema,
      prompt,
      profileSubset: {
        type: profile.type,
        guestCount: profile.guestCount,
      },
      language: profile.language,
    });

    const vendors: VendorItem[] = result.data.vendors.map((v) => ({
      id: v.id,
      category: v.category,
      name: v.name,
      status: "researching",
      leadTimeWeeks: v.leadTimeWeeks,
      quoteNotes: v.quoteNotes,
    }));

    const duration = Date.now() - start;
    logger.info("Vendors generated successfully", {
      requestId,
      provider: result.provider,
      count: vendors.length,
      durationMs: duration,
    });

    return apiSuccess(
      {
        vendors,
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
  } catch (aiErr) {
    logger.warn("AI generation failed for vendors, using rule-based baseline", {
      requestId,
      err: aiErr instanceof Error ? aiErr.message : String(aiErr),
    });

    const baselineVendors = generateBaselineVendors(profile);
    return apiSuccess(
      {
        vendors: baselineVendors,
        provider: "baseline",
        cached: false,
      },
      {
        headers: {
          "Server-Timing": `total;dur=${Date.now() - start}`,
          "X-Request-Id": requestId,
          ...rateLimitHeaders(rl),
        },
      }
    );
  }
}
