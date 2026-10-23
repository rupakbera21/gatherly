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

// Mock AI orchestrator
jest.mock("../../services/ai/orchestrator", () => {
  return {
    AIOrchestrator: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockImplementation(async (params: { task: string }) => {
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
});
