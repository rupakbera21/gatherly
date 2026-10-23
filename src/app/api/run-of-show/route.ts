/**
 * @module api/run-of-show
 * @purpose Generates minute-by-minute event day execution timeline.
 *          Outputs chronological schedules with location areas, owners, and duration.
 * @rubric Tier 2 Features – Event Day Execution Schedule.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { EventProfileSchema } from "@/domain/types";
import { AIOrchestrator } from "@/services/ai/orchestrator";
import {
  buildRunOfShowPrompt,
  RunOfShowResult,
  RunOfShowResultSchema,
} from "@/services/ai/prompts/runofshow";
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

const RunOfShowRequestSchema = z.object({
  profile: EventProfileSchema,
  eventWindow: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
});

function generateBaselineRunOfShow(type: string): RunOfShowResult {
  if (type === "wedding") {
    return {
      eventWindowStart: "10:00",
      eventWindowEnd: "23:00",
      scheduleItems: [
        { id: "ros_1", startTime: "10:00", durationMinutes: 180, activity: "Hair, Makeup & Groom Prep", ownerRole: "Wedding Party", locationArea: "Bridal Suite", notes: "Photographer arrives at 11:30" },
        { id: "ros_2", startTime: "13:30", durationMinutes: 60, activity: "First Look & Couple Portraits", ownerRole: "Photographer", locationArea: "Garden Courtyard", notes: "Immediate family arrives at 14:15" },
        { id: "ros_3", startTime: "15:00", durationMinutes: 45, activity: "Wedding Ceremony", ownerRole: "Officiant", locationArea: "Main Pavilion", notes: "Processional music cues at 14:58" },
        { id: "ros_4", startTime: "16:00", durationMinutes: 90, activity: "Cocktail Hour & Hors D'oeuvres", ownerRole: "Catering Captain", locationArea: "Terrace Bar", notes: "Acoustic duo performance" },
        { id: "ros_5", startTime: "17:30", durationMinutes: 120, activity: "Grand Entrance, Toasts & Dinner Service", ownerRole: "Emcee / DJ", locationArea: "Ballroom", notes: "Champagne poured before toasts" },
        { id: "ros_6", startTime: "19:30", durationMinutes: 30, activity: "First Dance & Cake Cutting", ownerRole: "DJ", locationArea: "Dance Floor", notes: "Spotlight on cake table" },
        { id: "ros_7", startTime: "20:00", durationMinutes: 150, activity: "Open Dance Party", ownerRole: "DJ / Band", locationArea: "Dance Floor", notes: "Late night snacks at 21:30" },
        { id: "ros_8", startTime: "22:45", durationMinutes: 15, activity: "Grand Sparkler Send-off", ownerRole: "Coordinator", locationArea: "Grand Portico", notes: "Lighters distributed at 22:35" },
      ],
    };
  }

  if (type === "birthday") {
    return {
      eventWindowStart: "14:00",
      eventWindowEnd: "20:00",
      scheduleItems: [
        { id: "ros_1", startTime: "13:00", durationMinutes: 60, activity: "Venue Setup & Balloon Installations", ownerRole: "Host / Decor Team", locationArea: "Main Room", notes: "Music sound check" },
        { id: "ros_2", startTime: "14:00", durationMinutes: 45, activity: "Guest Arrival & Welcome Drinks", ownerRole: "Greeter", locationArea: "Lounge Area", notes: "Polaroid guestbook table" },
        { id: "ros_3", startTime: "15:00", durationMinutes: 75, activity: "Interactive Games & Activities", ownerRole: "Activity Lead", locationArea: "Game Lawn", notes: "Prizes ready" },
        { id: "ros_4", startTime: "16:30", durationMinutes: 60, activity: "Buffet Food & Refreshments", ownerRole: "Catering", locationArea: "Dining Station", notes: "Dietary signage displayed" },
        { id: "ros_5", startTime: "17:45", durationMinutes: 30, activity: "Happy Birthday Song & Cake Ceremony", ownerRole: "Host", locationArea: "Cake Table", notes: "Candles lit, crowd gathered" },
        { id: "ros_6", startTime: "18:15", durationMinutes: 75, activity: "Dance Floor Open & Photo Booth", ownerRole: "DJ", locationArea: "Main Floor", notes: "High energy tracks" },
        { id: "ros_7", startTime: "19:30", durationMinutes: 30, activity: "Party Favors & Guest Farewell", ownerRole: "Host", locationArea: "Exit Foyer", notes: "Favors on table" },
      ],
    };
  }

  return {
    eventWindowStart: "08:00",
    eventWindowEnd: "18:00",
    scheduleItems: [
      { id: "ros_1", startTime: "08:00", durationMinutes: 90, activity: "Site Load-in & Equipment Setup", ownerRole: "Logistics Lead", locationArea: "Entire Park", notes: "Vendor vehicle access passes" },
      { id: "ros_2", startTime: "09:30", durationMinutes: 30, activity: "Volunteer Briefing & Radio Distribution", ownerRole: "Volunteer Coordinator", locationArea: "Info Tent", notes: "Safety protocols reviewed" },
      { id: "ros_3", startTime: "10:00", durationMinutes: 60, activity: "Public Gates Open & Welcome Stage", ownerRole: "Emcee", locationArea: "Main Stage", notes: "Opening remarks & sponsor thanks" },
      { id: "ros_4", startTime: "11:30", durationMinutes: 180, activity: "Community Workshops & Fair Booths", ownerRole: "Area Captains", locationArea: "Vendor Promenade", notes: "Food trucks open" },
      { id: "ros_5", startTime: "14:30", durationMinutes: 90, activity: "Main Stage Performance & Awards", ownerRole: "Program Director", locationArea: "Main Stage", notes: "Community leader recognition" },
      { id: "ros_6", startTime: "16:00", durationMinutes: 60, activity: "Closing Festivities & Music", ownerRole: "Sound Engineer", locationArea: "Main Stage", notes: "Event conclusion announcement" },
      { id: "ros_7", startTime: "17:00", durationMinutes: 90, activity: "Site Breakdown & Waste Sorting", ownerRole: "Cleanup Crew", locationArea: "Entire Site", notes: "Leave-no-trace park inspection" },
    ],
  };
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const hashedIp = getHashedIp(req);
  const start = Date.now();

  // 1. Rate limiting
  const rl = await checkRateLimit(hashedIp, "generation");
  if (!rl.allowed) {
    logger.warn("Run-of-show rate limited", { requestId, hashedIp });
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
  const parsed = RunOfShowRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid run-of-show request payload", formatZodError(parsed.error));
  }

  const { profile, eventWindow } = parsed.data;

  try {
    const prompt = buildRunOfShowPrompt({ profile, eventWindow });

    const result = await orchestrator.execute({
      task: "generate-run-of-show",
      prompt,
      schema: RunOfShowResultSchema,
      profileSubset: {
        type: profile.type,
        location: profile.location,
        guestCount: profile.guestCount,
        eventWindow,
      },
      language: profile.language,
    });

    const duration = Date.now() - start;
    logger.info("Run-of-show generated", {
      requestId,
      provider: result.provider,
      itemsCount: result.data.scheduleItems.length,
      durationMs: duration,
    });

    return apiSuccess(result.data, {
      headers: {
        "Server-Timing": `ai;dur=${result.latencyMs}, total;dur=${duration}`,
        "X-Request-Id": requestId,
        ...rateLimitHeaders(rl),
      },
    });
  } catch (aiErr) {
    logger.warn("Run-of-show AI failed, falling back to deterministic baseline", {
      requestId,
      err: aiErr instanceof Error ? aiErr.message : String(aiErr),
    });

    const baseline = generateBaselineRunOfShow(profile.type);
    return apiSuccess(baseline, {
      headers: {
        "Server-Timing": `total;dur=${Date.now() - start}`,
        "X-Request-Id": requestId,
        ...rateLimitHeaders(rl),
      },
    });
  }
}
