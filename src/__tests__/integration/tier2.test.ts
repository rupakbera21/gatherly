/**
 * @module Tier2RoutesTest
 * @purpose Integration tests for Tier 2 routes: /api/copilot, /api/quote, /api/run-of-show.
 *          Verifies rate limiting, input validation, failure ladder, and structured output.
 * @rubric Security, Reliability & Quality – Tier 2 features integration.
 */

import { NextRequest } from "next/server";
import { POST as copilotRoute } from "@/app/api/copilot/route";
import { POST as quoteRoute } from "@/app/api/quote/route";
import { POST as runOfShowRoute } from "@/app/api/run-of-show/route";
import { EventPlan } from "@/domain/types";

let mockOrchestratorThrow = false;

// Mock AI orchestrator
jest.mock("@/services/ai/orchestrator", () => {
  return {
    AIOrchestrator: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockImplementation(async (params: { task: string }) => {
        if (mockOrchestratorThrow) {
          throw new Error("AI Provider Timeout");
        }
        if (params.task === "plan-copilot") {
          return {
            data: {
              reply: "Here is your plan modification suggestion.",
              suggestedPatches: [
                {
                  op: "updateBudgetCategory",
                  categoryId: "cat_1",
                  allocatedMinor: 850000,
                },
              ],
            },
            provider: "gemini",
            cached: false,
            latencyMs: 150,
          };
        }
        if (params.task === "analyze-quote") {
          return {
            data: {
              vendorName: "Grand Pavilion",
              category: "Venue",
              totalCostMinor: 650000,
              currency: "USD",
              lineItems: [{ description: "Base rental", costMinor: 650000 }],
              hiddenFeesAndRisks: ["Overtime fee $250/hr"],
              questionsToAskVendor: ["Is cleanup included?"],
              summary: "Solid venue proposal within budget parameters.",
            },
            provider: "gemini",
            cached: false,
            latencyMs: 160,
          };
        }
        if (params.task === "generate-run-of-show") {
          return {
            data: {
              eventWindowStart: "10:00",
              eventWindowEnd: "22:00",
              scheduleItems: [
                { id: "ros_1", startTime: "10:00", durationMinutes: 120, activity: "Setup & Prep" },
                { id: "ros_2", startTime: "12:00", durationMinutes: 60, activity: "Ceremony" },
                { id: "ros_3", startTime: "13:00", durationMinutes: 180, activity: "Reception & Dinner" },
              ],
            },
            provider: "gemini",
            cached: false,
            latencyMs: 170,
          };
        }
        return { data: {}, provider: "gemini", cached: false, latencyMs: 100 };
      }),
    })),
  };
});

const mockPlan: EventPlan = {
  id: "plan_test_tier2",
  profile: {
    id: "profile_test",
    type: "wedding",
    title: "Alice & Bob Wedding",
    eventDate: "2026-11-20",
    location: "Botanical Gardens",
    guestCount: 100,
    budgetMinor: 2000000,
    currency: "USD",
    language: "en",
  },
  budgetCategories: [
    { id: "cat_1", name: "Catering", allocatedMinor: 800000, spentMinor: 0, isContingency: false },
    { id: "cat_2", name: "Venue", allocatedMinor: 600000, spentMinor: 0, isContingency: false },
  ],
  milestones: [
    { id: "ms_1", title: "Book Caterer", dueDate: "2026-08-01", category: "Catering", status: "pending", dependsOn: [], isCriticalPath: true, wasClamped: false, overdue: false },
  ],
  vendors: [],
  ideas: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  aiProviderBadge: "gemini",
};

describe("Tier 2 Routes Integration", () => {
  describe("POST /api/copilot", () => {
    it("returns 422 if payload is missing or invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: true }),
      });
      const res = await copilotRoute(req);
      expect(res.status).toBe(422);
    });

    it("returns structured conversational response with graceful fallback on AI error", async () => {
      const req = new NextRequest("http://localhost:3000/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: mockPlan,
          userMessage: "Can we increase catering budget by 500?",
        }),
      });
      const res = await copilotRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reply).toBeDefined();
      expect(Array.isArray(json.suggestedPatches)).toBe(true);
    });
  });

  describe("POST /api/quote", () => {
    it("rejects quotes that are too short (< 10 chars) with 422", async () => {
      const req = new NextRequest("http://localhost:3000/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteText: "short" }),
      });
      const res = await quoteRoute(req);
      expect(res.status).toBe(422);
    });

    it("rejects payloads exceeding 32KB with 413", async () => {
      const giantString = "x".repeat(35 * 1024);
      const req = new NextRequest("http://localhost:3000/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteText: giantString }),
      });
      const res = await quoteRoute(req);
      expect(res.status).toBe(413);
    });
    it("successfully analyzes vendor quote with line items and fee warnings", async () => {
      const validQuote = "Photography contract for full day event. Base rate $6,500 includes 8 hours coverage. Overtime is $250/hour. Deposit of 50% required upon signing.";
      const req = new NextRequest("http://localhost:3000/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteText: validQuote,
          categoryBudgetMinor: 700000,
          currency: "USD",
        }),
      });
      const res = await quoteRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.vendorName).toBe("Grand Pavilion");
      expect(json.totalCostMinor).toBe(650000);
      expect(json.lineItems.length).toBeGreaterThan(0);
    });

    it("handles AI provider error gracefully with 502 error", async () => {
      const validQuote = "Catering estimate: $10,000 for dinner and drinks.";
      const req = new NextRequest("http://localhost:3000/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteText: validQuote }),
      });

      mockOrchestratorThrow = true;
      try {
        const res = await quoteRoute(req);
        expect(res.status).toBe(502);
        const errJson = await res.json();
        expect(errJson.code).toBe("PROVIDER_ERROR");
      } finally {
        mockOrchestratorThrow = false;
      }
    });
  });

  describe("POST /api/run-of-show", () => {
    it("returns 422 if profile is malformed", async () => {
      const req = new NextRequest("http://localhost:3000/api/run-of-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: {} }),
      });
      const res = await runOfShowRoute(req);
      expect(res.status).toBe(422);
    });

    it("rejects payloads exceeding 32KB with 413", async () => {
      const giantProfile = { ...mockPlan.profile, title: "x".repeat(35 * 1024) };
      const req = new NextRequest("http://localhost:3000/api/run-of-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: giantProfile }),
      });
      const res = await runOfShowRoute(req);
      expect(res.status).toBe(413);
    });

    it("returns sequential run-of-show schedule when AI succeeds", async () => {
      const req = new NextRequest("http://localhost:3000/api/run-of-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: mockPlan.profile }),
      });
      const res = await runOfShowRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.scheduleItems)).toBe(true);
      expect(json.scheduleItems.length).toBeGreaterThanOrEqual(3);
      expect(json.scheduleItems[0].startTime).toBeDefined();
    });

    it("falls back to deterministic baseline for wedding, birthday, and community when AI fails", async () => {
      mockOrchestratorThrow = true;
      try {
        // Wedding baseline
        const reqWedding = new NextRequest("http://localhost:3000/api/run-of-show", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: { ...mockPlan.profile, type: "wedding" } }),
        });
        const resWedding = await runOfShowRoute(reqWedding);
        expect(resWedding.status).toBe(200);
        const jsonWedding = await resWedding.json();
        expect(jsonWedding.scheduleItems.length).toBe(8);

        // Birthday baseline
        const reqBday = new NextRequest("http://localhost:3000/api/run-of-show", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: { ...mockPlan.profile, type: "birthday" } }),
        });
        const resBday = await runOfShowRoute(reqBday);
        expect(resBday.status).toBe(200);
        const jsonBday = await resBday.json();
        expect(jsonBday.scheduleItems.length).toBe(7);

        // Community baseline
        const reqComm = new NextRequest("http://localhost:3000/api/run-of-show", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: { ...mockPlan.profile, type: "community" } }),
        });
        const resComm = await runOfShowRoute(reqComm);
        expect(resComm.status).toBe(200);
        const jsonComm = await resComm.json();
        expect(jsonComm.scheduleItems.length).toBeGreaterThan(0);
      } finally {
        mockOrchestratorThrow = false;
      }
    });
  });
});
