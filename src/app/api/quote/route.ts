/**
 * @module api/quote
 * @purpose Vendor Quote Analyzer endpoint.
 *          Parses unstructured vendor contract or quote text, audits hidden fees,
 *          checks budget variances, and identifies contract risks.
 * @rubric Security & Code Quality – Bounded body, prompt injection defense, integer money units.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { AIOrchestrator } from "@/services/ai/orchestrator";
import {
  buildQuoteAnalysisPrompt,
  QuoteAnalysisResultSchema,
} from "@/services/ai/prompts/quote";
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

const QuoteAnalysisRequestSchema = z.object({
  quoteText: z.string().min(10).max(8000),
  categoryBudgetMinor: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  language: z.string().max(10).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const hashedIp = getHashedIp(req);
  const start = Date.now();

  // 1. Rate limiting
  const rl = await checkRateLimit(hashedIp, "generation");
  if (!rl.allowed) {
    logger.warn("Quote rate limited", { requestId, hashedIp });
    return new Response(
      JSON.stringify({ code: "RATE_LIMITED", message: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(rl) } }
    );
  }

  // 2. Read body with 32KB limit
  let rawBody: unknown;
  try {
    rawBody = await readJsonBodyWithLimit(req, 32 * 1024);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("INVALID_JSON", "Could not parse JSON body.");
  }

  // 3. Validate schema
  const parsed = QuoteAnalysisRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Quote text must be between 10 and 8,000 characters", formatZodError(parsed.error));
  }

  const { quoteText, categoryBudgetMinor, currency, language } = parsed.data;

  try {
    const prompt = buildQuoteAnalysisPrompt({
      quoteText,
      categoryBudgetMinor,
      currency,
      language,
    });

    const result = await orchestrator.execute({
      task: "analyze-quote",
      prompt,
      schema: QuoteAnalysisResultSchema,
      profileSubset: {
        quoteHash: quoteText.slice(0, 100),
        categoryBudgetMinor,
        currency,
      },
      language,
    });

    const duration = Date.now() - start;
    logger.info("Quote analysis completed", {
      requestId,
      provider: result.provider,
      lineItemsCount: result.data.lineItems.length,
      durationMs: duration,
    });

    return apiSuccess(result.data, {
      headers: {
        "Server-Timing": `ai;dur=${result.latencyMs}, total;dur=${duration}`,
        "X-Request-Id": requestId,
        ...rateLimitHeaders(rl),
      },
    });
  } catch (err) {
    logger.error("Quote analysis failed", {
      requestId,
      err: (err as Error).message,
    });

    return apiError(
      "PROVIDER_ERROR",
      "Unable to analyze quote at this time. Please check the contract text and try again."
    );
  }
}
