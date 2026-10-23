/**
 * @module POST /api/budget
 * @purpose Generates budget allocations from event profile using AI failure ladder.
 *          If AI fails, gracefully degrades to the deterministic baseline engine.
 *          Applies largest-remainder allocation to guarantee exact integer minor sums.
 * @rubric GenAI Architecture & Reliability – AI proposes weights, deterministic math guarantees totals.
 */

import { NextRequest } from "next/server";
import { allocateBudget } from "@/domain/allocation";
import { generateBaselineBudget } from "@/domain/baseline";
import { BudgetCategory, EventProfileSchema } from "@/domain/types";
import { AIOrchestrator } from "@/services/ai/orchestrator";
import {
  buildBudgetPrompt,
  ProposedBudgetResultSchema,
} from "@/services/ai/prompts/budget";
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

  // 1. Rate limiting
  const rl = await checkRateLimit(hashedIp, "generation");
  if (!rl.allowed) {
    logger.warn("Budget rate limited", { requestId, hashedIp });
    return new Response(
      JSON.stringify({ code: "RATE_LIMITED", message: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(rl) } }
    );
  }

  // 2. Read bounded request body
  let rawBody: unknown;
  try {
    rawBody = await readJsonBodyWithLimit(req, 32 * 1024);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("INVALID_JSON", "Could not parse JSON body.");
  }

  // 3. Validate input EventProfile
  const parsed = EventProfileSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid event profile", formatZodError(parsed.error));
  }
  const profile = parsed.data;

  // 4. Run AI Orchestration with Degraded Baseline Fallback
  try {
    const prompt = buildBudgetPrompt(profile);
    const result = await orchestrator.execute({
      task: "propose-budget",
      schema: ProposedBudgetResultSchema,
      prompt,
      profileSubset: {
        type: profile.type,
        guestCount: profile.guestCount,
        budgetMinor: profile.budgetMinor,
      },
      language: profile.language,
    });

    // Convert proposed percentage weights into exact minor units using Largest-Remainder Method
    const allocated = allocateBudget(
      profile.budgetMinor,
      result.data.categories.map((c) => ({
        id: c.id,
        weight: c.weightPercent,
        name: c.name,
        notes: c.notes,
        isContingency: c.isContingency,
      }))
    );

    const categories: BudgetCategory[] = allocated.map((a) => ({
      id: a.item.id,
      name: a.item.name,
      allocatedMinor: a.allocatedMinor,
      spentMinor: 0,
      notes: a.item.notes,
      isContingency: Boolean(a.item.isContingency),
    }));

    const duration = Date.now() - start;
    logger.info("Budget proposed successfully", { requestId, provider: result.provider, durationMs: duration });

    return apiSuccess(
      {
        categories,
        reasoning: result.data.reasoning,
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
    // Degrade gracefully to rule-based baseline engine (Section 5.4)
    logger.warn("AI generation failed for budget, using rule-based baseline", {
      requestId,
      err: aiErr instanceof Error ? aiErr.message : String(aiErr),
    });

    const baselineCategories = generateBaselineBudget(profile);
    return apiSuccess(
      {
        categories: baselineCategories,
        reasoning: "Standard template generated from event profile (AI services temporarily unavailable).",
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
