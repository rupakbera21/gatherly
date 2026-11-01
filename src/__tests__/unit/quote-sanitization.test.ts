/**
 * @module quote-sanitization.test
 * @purpose Unit tests for Quote Analysis sanitization and error handling:
 *          - Missing fields default gracefully
 *          - Wrong types coerced or defaulted
 *          - Negative amounts converted to positive/zero
 *          - Extra keys stripped cleanly by Zod
 *          - Oversized input (> 8000 chars) rejected with 422
 *          - Route handler returns 422 on garbage and never throws
 */

import { NextRequest } from "next/server";
import { POST as quotePostHandler } from "@/app/api/quote/route";
import { QuoteAnalysisResultSchema, sanitizeQuoteOutput } from "@/services/ai/prompts/quote";

// Mock rate limiter to always allow in unit tests
jest.mock("@/services/ratelimit", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    allowed: true,
    remaining: 10,
    resetAt: Date.now() + 60000,
    failedOpen: false,
  }),
  rateLimitHeaders: jest.fn().mockReturnValue({}),
}));

describe("Quote Sanitization & Schema Validation Unit Tests", () => {
  it("exports sanitizeQuoteOutput preprocessor function and cleans raw input directly", () => {
    expect(typeof sanitizeQuoteOutput).toBe("function");
    const raw = { totalCostMinor: "-50000" };
    const cleaned = sanitizeQuoteOutput(raw) as Record<string, unknown>;
    expect(cleaned.totalCostMinor).toBe(50000);
  });

  it("handles missing optional fields and populates safe defaults", () => {
    const raw = {
      vendorName: "Grand Palace Hotel",
    };

    const parsed = QuoteAnalysisResultSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.vendorName).toBe("Grand Palace Hotel");
    expect(parsed.data.currency).toBe("USD");
    expect(parsed.data.lineItems).toEqual([]);
    expect(parsed.data.hiddenFeesAndRisks).toEqual([]);
    expect(parsed.data.questionsToAskVendor).toEqual([]);
    expect(parsed.data.summary).toBe("Quote analysis complete.");
  });

  it("handles negative amounts by converting them to non-negative values", () => {
    const raw = {
      vendorName: "Catering Co",
      totalCostMinor: -450000,
      lineItems: [
        { description: "Buffet line", costMinor: -200000 },
        { description: "Service staff", costMinor: 50000 },
      ],
    };

    const parsed = QuoteAnalysisResultSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.totalCostMinor).toBe(450000);
    expect(parsed.data.lineItems?.[0]?.costMinor).toBe(200000);
    expect(parsed.data.lineItems?.[1]?.costMinor).toBe(50000);
  });

  it("handles wrong types and converts string numbers with formatting", () => {
    const raw = {
      vendorName: "Sound and Lights",
      totalCostMinor: "₹1,20,000",
      line_items: [
        { description: "PA System", costMinor: "50,000" },
      ],
      hiddenFeesAndRisks: "Generator surcharge if power trips",
      questionsToAskVendor: "Is backup console provided?",
      summary: { text: "Complete audio setup proposal" },
    };

    const parsed = QuoteAnalysisResultSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.totalCostMinor).toBe(120000);
    expect(parsed.data.lineItems?.[0]?.costMinor).toBe(50000);
    expect(parsed.data.hiddenFeesAndRisks).toEqual(["Generator surcharge if power trips"]);
    expect(parsed.data.questionsToAskVendor).toEqual(["Is backup console provided?"]);
    expect(parsed.data.summary).toBe("Complete audio setup proposal");
  });

  it("safely strips extraneous untrusted keys", () => {
    const raw = {
      vendorName: "Decor Studio",
      untrustedKey: "some malicious instruction or leaked token",
      adminOverride: true,
      hiddenField: { deep: "secret" },
    };

    const parsed = QuoteAnalysisResultSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const dataObj = parsed.data as Record<string, unknown>;
    expect(dataObj["untrustedKey"]).toBeUndefined();
    expect(dataObj["adminOverride"]).toBeUndefined();
    expect(dataObj["hiddenField"]).toBeUndefined();
  });

  describe("POST /api/quote route error handling", () => {
    it("returns 422 VALIDATION_ERROR on garbage JSON / missing quoteText", async () => {
      const req = new NextRequest("http://localhost:3000/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garbage: 12345, notAQuote: true }),
      });

      const response = await quotePostHandler(req);
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.message).toContain("between 10 and 8,000 characters");
    });

    it("returns 422 VALIDATION_ERROR when quoteText is too short (< 10 chars)", async () => {
      const req = new NextRequest("http://localhost:3000/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteText: "Too short" }),
      });

      const response = await quotePostHandler(req);
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 VALIDATION_ERROR when quoteText exceeds 8,000 characters", async () => {
      const oversizedText = "A".repeat(8005);
      const req = new NextRequest("http://localhost:3000/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteText: oversizedText }),
      });

      const response = await quotePostHandler(req);
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 INVALID_JSON on unparseable JSON stream without throwing", async () => {
      const req = new NextRequest("http://localhost:3000/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json corrupt",
      });

      const response = await quotePostHandler(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.code).toBe("INVALID_JSON");
    });
  });
});
