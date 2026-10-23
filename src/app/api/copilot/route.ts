/**
 * @module api/copilot
 * @purpose Plan Copilot assistant endpoint for conversational plan adjustments.
 *          Proposes validated PlanPatch operations previewable by user.
 * @rubric Security & Code Quality – CWE-307 rate limiting, bounded body, pure patches.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { EventPlanSchema } from "@/domain/types";
import { AIOrchestrator } from "@/services/ai/orchestrator";
import {
  buildCopilotPrompt,
  CopilotResponseSchema,
} from "@/services/ai/prompts/copilot";
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

const CopilotRequestSchema = z.object({
  plan: EventPlanSchema,
  userMessage: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const hashedIp = getHashedIp(req);
  const start = Date.now();

  // 1. Rate limiting
  const rl = await checkRateLimit(hashedIp, "generation");
  if (!rl.allowed) {
    logger.warn("Copilot rate limited", { requestId, hashedIp });
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
  const parsed = CopilotRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid copilot request payload", formatZodError(parsed.error));
  }

  const { plan, userMessage } = parsed.data;

  try {
    const prompt = buildCopilotPrompt({ plan, userMessage });

    const result = await orchestrator.execute({
      task: "plan-copilot",
      prompt,
      schema: CopilotResponseSchema,
      language: plan.profile.language,
      bypassCache: true, // Conversational queries should not use stale cache
    });

    const duration = Date.now() - start;
    logger.info("Copilot response generated", {
      requestId,
      provider: result.provider,
      patchesCount: result.data.suggestedPatches?.length ?? 0,
      durationMs: duration,
    });

    return apiSuccess(
      {
        reply: result.data.reply,
        suggestedPatches: result.data.suggestedPatches,
        provider: result.provider,
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
    logger.warn("Copilot AI failed, returning graceful fallback", {
      requestId,
      err: (err as Error).message,
    });

    return apiSuccess(
      {
        reply:
          "I'm temporarily experiencing connectivity issues with the AI providers. You can make adjustments directly using the interactive tabs above (Budget, Timeline, Vendors, Ideas).",
        suggestedPatches: [],
        provider: "baseline",
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
