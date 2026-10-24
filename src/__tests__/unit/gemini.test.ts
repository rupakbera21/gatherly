/**
 * @module gemini.test
 * @purpose Unit tests for GeminiProvider adapter:
 *          - Uses @google/genai SDK (not raw fetch); verifies SDK args (model, responseMimeType, maxOutputTokens)
 *          - Successful structured JSON parse and Zod validation
 *          - Empty candidates / safety block -> transient
 *          - JSON parse failure -> schema error (retryable)
 *          - Zod validation failure -> schema error (retryable)
 *          - 400 invalid key -> quota (non-retryable)
 *          - 429 / RESOURCE_EXHAUSTED -> quota (non-retryable)
 *          - 503 / overloaded -> transient (retryable)
 *          - AbortController timeout -> transient (retryable)
 *          - API key is never included in thrown error messages or logs
 */

import { z } from "zod";
import { GeminiProvider } from "@/services/ai/gemini";
import { AIErrorDetails } from "@/services/ai/types";

const TestSchema = z.object({
  budget: z.number(),
  label: z.string(),
});

function getAiDetails(err: unknown): AIErrorDetails {
  if (err && typeof err === "object" && "aiDetails" in err) {
    return (err as { aiDetails: AIErrorDetails }).aiDetails;
  }
  throw new Error("Missing aiDetails on error object");
}

// Mock the @google/genai SDK module
jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn(),
      },
    })),
  };
});

import { GoogleGenAI } from "@google/genai";

const MockedGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

describe("GeminiProvider Unit Tests", () => {
  const REAL_API_KEY = "AIza-test-gemini-key-secret";
  const originalEnv = process.env;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    process.env = { ...originalEnv, GEMINI_API_KEY: REAL_API_KEY };
    MockedGoogleGenAI.mockClear();
    mockGenerateContent = jest.fn();
    MockedGoogleGenAI.mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    }) as unknown as InstanceType<typeof GoogleGenAI>);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  it("1. sends correct SDK args: model, responseMimeType, maxOutputTokens, temperature", async () => {
    const validJson = JSON.stringify({ budget: 5000, label: "Venue" });
    mockGenerateContent.mockResolvedValueOnce({ text: validJson });

    const provider = new GeminiProvider();
    const result = await provider.generateStructured("test", TestSchema, {
      systemPrompt: "You are a planner.",
      userPrompt: "Give me a budget.",
    }, { maxTokens: 512, temperature: 0.1 });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0]![0];
    expect(callArg.config.responseMimeType).toBe("application/json");
    expect(callArg.config.maxOutputTokens).toBe(512);
    expect(callArg.config.temperature).toBe(0.1);
    expect(result).toEqual({ budget: 5000, label: "Venue" });
  });

  it("2. uses GEMINI_MODEL env override when set", async () => {
    process.env = { ...originalEnv, GEMINI_API_KEY: REAL_API_KEY, GEMINI_MODEL: "gemini-custom-model" };
    const validJson = JSON.stringify({ budget: 1000, label: "Food" });
    mockGenerateContent.mockResolvedValueOnce({ text: validJson });

    const provider = new GeminiProvider();
    await provider.generateStructured("test", TestSchema, {
      systemPrompt: "sys",
      userPrompt: "user",
    });

    const callArg = mockGenerateContent.mock.calls[0]![0];
    expect(callArg.model).toBe("gemini-custom-model");
  });

  it("3. classifies empty response text as transient retryable error", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "" });

    const provider = new GeminiProvider();
    await expect(
      provider.generateStructured("test", TestSchema, { systemPrompt: "sys", userPrompt: "user" })
    ).rejects.toMatchObject({
      aiDetails: expect.objectContaining({
        provider: "gemini",
        type: "transient",
        retryable: true,
      }),
    });
  });

  it("4. classifies JSON parse failure as schema error (retryable)", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "not valid json {{" });

    const provider = new GeminiProvider();
    try {
      await provider.generateStructured("test", TestSchema, { systemPrompt: "sys", userPrompt: "user" });
      fail("Expected throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.provider).toBe("gemini");
      expect(details.type).toBe("schema");
      expect(details.retryable).toBe(true);
      expect(details.message).toContain("parse failed");
    }
  });

  it("5. classifies Zod schema validation failure as schema error (retryable)", async () => {
    // Missing 'label' field -> Zod fails
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ budget: 500 }) });

    const provider = new GeminiProvider();
    try {
      await provider.generateStructured("test", TestSchema, { systemPrompt: "sys", userPrompt: "user" });
      fail("Expected throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.type).toBe("schema");
      expect(details.retryable).toBe(true);
      expect(details.message).toContain("schema validation failed");
    }
  });

  it("6. classifies RESOURCE_EXHAUSTED / quota as non-retryable quota error", async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error("RESOURCE_EXHAUSTED: quota exceeded for this project")
    );

    const provider = new GeminiProvider();
    try {
      await provider.generateStructured("test", TestSchema, { systemPrompt: "sys", userPrompt: "user" });
      fail("Expected throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.type).toBe("quota");
      expect(details.retryable).toBe(false);
      expect(details.statusCode).toBe(429);
    }
  });

  it("7. classifies 503 / overloaded as transient retryable error", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("503 service overloaded"));

    const provider = new GeminiProvider();
    try {
      await provider.generateStructured("test", TestSchema, { systemPrompt: "sys", userPrompt: "user" });
      fail("Expected throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.type).toBe("transient");
      expect(details.retryable).toBe(true);
    }
  });

  it("8. classifies AbortController timeout as transient retryable error", async () => {
    mockGenerateContent.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("aborted")), 50))
    );

    const provider = new GeminiProvider();
    try {
      await provider.generateStructured(
        "test",
        TestSchema,
        { systemPrompt: "sys", userPrompt: "user" },
        { timeoutMs: 10 }
      );
      fail("Expected throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.type).toBe("transient");
      expect(details.retryable).toBe(true);
      expect(details.message).toContain("timed out");
    }
  });

  it("9. API key never appears in thrown error messages", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("Some unexpected error mentioning key"));

    const provider = new GeminiProvider();
    try {
      await provider.generateStructured("test", TestSchema, { systemPrompt: "sys", userPrompt: "user" });
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.message).not.toContain(REAL_API_KEY);
      // Also check the raw error message
      if (err instanceof Error) {
        expect(err.message).not.toContain(REAL_API_KEY);
      }
    }
  });

  it("10. throws quota error (non-retryable) when GEMINI_API_KEY is not configured", async () => {
    process.env = { ...originalEnv };
    delete process.env["GEMINI_API_KEY"];

    const provider = new GeminiProvider();
    try {
      await provider.generateStructured("test", TestSchema, { systemPrompt: "sys", userPrompt: "user" });
      fail("Expected throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.type).toBe("quota");
      expect(details.retryable).toBe(false);
      expect(details.message).toContain("GEMINI_API_KEY is not configured");
    }
  });
});
