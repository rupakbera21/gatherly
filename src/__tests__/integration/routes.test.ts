/**
 * @module routes.test
 * @purpose Integration tests for Tier 1 generation endpoints:
 *          POST /api/budget, POST /api/timeline, POST /api/vendors, and POST /api/ideas.
 *          Verifies schema validation, provider output handling, and baseline fallback.
 */

import { NextRequest } from "next/server";
import { POST as budgetRoute } from "../../app/api/budget/route";
import { POST as ideasRoute } from "../../app/api/ideas/route";
import { POST as timelineRoute } from "../../app/api/timeline/route";
import { POST as vendorsRoute } from "../../app/api/vendors/route";

let mockRouteOrchestratorThrow = false;

// Mock AI orchestrator
jest.mock("../../services/ai/orchestrator", () => {
  return {
    AIOrchestrator: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockImplementation(async (params: { task: string }) => {
        if (mockRouteOrchestratorThrow) {
          throw new Error("AI Execution Failed");
        }
        if (params.task === "propose-budget") {
          return {
            data: {
              categories: [
                { id: "venue", name: "Venue", weightPercent: 20 },
                { id: "catering", name: "Catering", weightPercent: 70 },
                { id: "contingency", name: "Contingency", weightPercent: 10, isContingency: true },
              ],
              reasoning: "Scaled for 100 guests",
            },
            provider: "gemini",
            cached: false,
            latencyMs: 120,
          };
        }
        if (params.task === "generate-timeline") {
          return {
            data: {
              milestones: [
                { id: "m1", title: "Book venue", targetWeeksBefore: 12, category: "Venue" },
                { id: "m2", title: "Send invites", targetWeeksBefore: 6, category: "Invites", dependsOn: ["m1"] },
              ],
            },
            provider: "gemini",
            cached: false,
            latencyMs: 140,
          };
        }
        if (params.task === "generate-vendors") {
          return {
            data: {
              vendors: [
                { id: "v1", category: "Venue", name: "Grand Garden", leadTimeWeeks: 16 },
                { id: "v2", category: "Catering", name: "Artisan Kitchen", leadTimeWeeks: 12 },
              ],
            },
            provider: "gemini",
            cached: false,
            latencyMs: 100,
          };
        }
        if (params.task === "generate-ideas") {
          return {
            data: {
              ideas: [
                { id: "i1", title: "Interactive Food Station", description: "Taco and bao bar", category: "Food" },
                { id: "i2", title: "Live String Quartet", description: "Modern pop covers", category: "Music" },
              ],
            },
            provider: "gemini",
            cached: false,
            latencyMs: 150,
          };
        }
        throw new Error("Unknown task");
      }),
    })),
  };
});

const sampleProfile = {
  id: "evt_1",
  type: "wedding" as const,
  title: "Sophie & Liam Wedding",
  eventDate: "2027-06-20",
  guestCount: 100,
  budgetMinor: 2000000, // $20,000.00
  currency: "USD",
  language: "en",
};

describe("Tier 1 API Endpoints Integration Tests", () => {
  it("POST /api/budget allocates exact integer sum and returns categories", async () => {
    const req = new NextRequest("http://localhost:3000/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleProfile),
    });

    const res = await budgetRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.categories).toHaveLength(3);

    const totalAllocated = json.categories.reduce(
      (acc: number, c: { allocatedMinor: number }) => acc + c.allocatedMinor,
      0
    );
    expect(totalAllocated).toBe(sampleProfile.budgetMinor);
    expect(json.provider).toBe("gemini");
  });

  it("POST /api/timeline returns scheduled and topologically sorted milestones", async () => {
    const req = new NextRequest("http://localhost:3000/api/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleProfile),
    });

    const res = await timelineRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.milestones).toHaveLength(2);
    expect(json.milestones[0].dueDate).toBeDefined();
    expect(json.hasCycle).toBe(false);
  });

  it("POST /api/vendors returns recommended vendor items", async () => {
    const req = new NextRequest("http://localhost:3000/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleProfile),
    });

    const res = await vendorsRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.vendors).toHaveLength(2);
    expect(json.vendors[0].name).toBe("Grand Garden");
  });

  it("POST /api/ideas returns deduplicated personalized ideas", async () => {
    const req = new NextRequest("http://localhost:3000/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: sampleProfile,
        existingTitles: [],
        regenerate: false,
      }),
    });

    const res = await ideasRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ideas).toHaveLength(2);
    expect(json.ideas[0].title).toBe("Interactive Food Station");
  });

  it("returns 422 on invalid profile for POST /api/budget", async () => {
    const req = new NextRequest("http://localhost:3000/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: "data" }),
    });
    const res = await budgetRoute(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 on invalid profile for POST /api/timeline", async () => {
    const req = new NextRequest("http://localhost:3000/api/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: "data" }),
    });
    const res = await timelineRoute(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 on invalid profile for POST /api/vendors", async () => {
    const req = new NextRequest("http://localhost:3000/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: "data" }),
    });
    const res = await vendorsRoute(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 on invalid body for POST /api/ideas", async () => {
    const req = new NextRequest("http://localhost:3000/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: "data" }),
    });
    const res = await ideasRoute(req);
    expect(res.status).toBe(422);
  });

  it("falls back to deterministic baseline for all Tier 1 routes when AI fails", async () => {
    mockRouteOrchestratorThrow = true;
    try {
      // Budget fallback
      const reqBudget = new NextRequest("http://localhost:3000/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleProfile),
      });
      const resBudget = await budgetRoute(reqBudget);
      expect(resBudget.status).toBe(200);
      const jsonBudget = await resBudget.json();
      expect(jsonBudget.categories.length).toBeGreaterThan(0);

      // Timeline fallback
      const reqTimeline = new NextRequest("http://localhost:3000/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleProfile),
      });
      const resTimeline = await timelineRoute(reqTimeline);
      expect(resTimeline.status).toBe(200);
      const jsonTimeline = await resTimeline.json();
      expect(jsonTimeline.milestones.length).toBeGreaterThan(0);

      // Vendors fallback
      const reqVendors = new NextRequest("http://localhost:3000/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleProfile),
      });
      const resVendors = await vendorsRoute(reqVendors);
      expect(resVendors.status).toBe(200);
      const jsonVendors = await resVendors.json();
      expect(jsonVendors.vendors.length).toBeGreaterThan(0);

      // Ideas has no deterministic baseline (Section 5.4) -> returns honest 502 retryable error
      const reqIdeas = new NextRequest("http://localhost:3000/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: sampleProfile, existingTitles: [] }),
      });
      const resIdeas = await ideasRoute(reqIdeas);
      expect(resIdeas.status).toBe(502);
      const jsonIdeas = await resIdeas.json();
      expect(jsonIdeas.code).toBe("PROVIDER_ERROR");
    } finally {
      mockRouteOrchestratorThrow = false;
    }
  });
});
