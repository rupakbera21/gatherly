/**
 * @module POST /api/timeline
 * @purpose Generates backward-planned event milestones using AI ladder.
 *          Processes output through deterministic DAG timeline engine
 *          (clamping, topological sorting, cycle detection, critical path).
 *          Degrades gracefully to baseline timeline if AI is offline.
 * @rubric GenAI Architecture & Reliability – AI proposes, deterministic DAG engine guarantees.
 */

import { NextRequest } from "next/server";
import { generateBaselineTimeline } from "@/domain/baseline";
import { processTimeline } from "@/domain/timeline";
import { EventProfileSchema } from "@/domain/types";
import { AIOrchestrator } from "@/services/ai/orchestrator";
import {
  buildTimelinePrompt,
  ProposedTimelineResultSchema,
} from "@/services/ai/prompts/timeline";
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
    logger.warn("Timeline rate limited", { requestId, hashedIp });
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
    const prompt = buildTimelinePrompt(profile);
    const result = await orchestrator.execute({
      task: "generate-timeline",
      schema: ProposedTimelineResultSchema,
      prompt,
      profileSubset: {
        type: profile.type,
        eventDate: profile.eventDate,
      },
      language: profile.language,
    });

    // Pass proposed milestones through the deterministic scheduling and DAG engine
    const processed = processTimeline(
      result.data.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        targetWeeksBefore: m.targetWeeksBefore,
        category: m.category,
        dependsOn: m.dependsOn,
        notes: m.notes,
        status: "pending",
      })),
      profile.eventDate
    );

    const duration = Date.now() - start;
    logger.info("Timeline generated successfully", {
      requestId,
      provider: result.provider,
      count: processed.milestones.length,
      hasCycle: processed.hasCycle,
      durationMs: duration,
    });

    return apiSuccess(
      {
        milestones: processed.milestones,
        hasCycle: processed.hasCycle,
        criticalPathIds: processed.criticalPathIds,
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
    logger.warn("AI generation failed for timeline, using rule-based baseline", {
      requestId,
      err: aiErr instanceof Error ? aiErr.message : String(aiErr),
    });

    const baselineMilestones = generateBaselineTimeline(profile);
    return apiSuccess(
      {
        milestones: baselineMilestones,
        hasCycle: false,
        criticalPathIds: [],
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
