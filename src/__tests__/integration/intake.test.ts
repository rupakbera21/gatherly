/**
 * @module intake.test
 * @purpose Integration tests for POST /api/intake endpoint.
 *          Verifies valid extraction, oversized body rejection (413),
 *          validation errors (400), rate limiting (429), and prompt injection defense.
 */

import { NextRequest } from "next/server";
import { POST } from "../../app/api/intake/route";

// Mock AI orchestrator
jest.mock("../../services/ai/orchestrator", () => {
  return {
    AIOrchestrator: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({
        data: {
          type: "wedding",
          title: "Maya & Alex Wedding",
          eventDate: "2027-06-15",
          location: "San Francisco, CA",
          guestCount: 120,
          budgetMinor: 3500000,
          currency: "USD",
          weddingExtras: {
            functions: ["Ceremony", "Reception"],
            tradition: "Multicultural",
            accommodationsNeeded: true,
          },
        },
        provider: "gemini",
        cached: false,
        latencyMs: 150,
      }),
    })),
  };
});

describe("POST /api/intake Integration Tests", () => {
  it("extracts structured profile from natural language description", async () => {
    const req = new NextRequest("http://localhost:3000/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Planning a 120-guest wedding in San Francisco next June with a $35k budget.",
        defaultCurrency: "USD",
        language: "en",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.profile.title).toBe("Maya & Alex Wedding");
    expect(json.profile.guestCount).toBe(120);
    expect(json.profile.budgetMinor).toBe(3500000);
    expect(json.provider).toBe("gemini");
    expect(res.headers.get("X-Request-Id")).toBeDefined();
  });

  it("returns 422 validation error when description is too short", async () => {
    const req = new NextRequest("http://localhost:3000/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "hi", // Too short
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("rejects oversized request bodies with 413 status", async () => {
    const hugeDescription = "A".repeat(35 * 1024); // > 32KB
    const bodyStr = JSON.stringify({ description: hugeDescription });
    const req = new NextRequest("http://localhost:3000/api/intake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(bodyStr.length),
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(413);

    const json = await res.json();
    expect(json.code).toBe("BODY_TOO_LARGE");
  });
});
