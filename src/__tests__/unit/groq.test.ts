/**
 * @module groq.test
 * @purpose Unit tests for GroqProvider adapter:
 *          - Auth header (Authorization: Bearer)
 *          - Request body (response_format: json_object and "JSON" in prompt)
 *          - OpenAI-style SSE stream parsing
 *          - HTTP 401 (invalid key), 429 (rate/quota + retry-after), 5xx classification
 *          - Zod schema validation and error reporting
 */

import { z } from "zod";
import { GroqProvider } from "@/services/ai/groq";
import { AIErrorDetails } from "@/services/ai/types";

const TestSchema = z.object({
  greeting: z.string(),
  count: z.number(),
});

interface ChatBodyPayload {
  response_format?: { type: string };
  messages?: Array<{ role: string; content: string }>;
}

function getAiDetails(err: unknown): AIErrorDetails {
  if (err && typeof err === "object" && "aiDetails" in err) {
    return (err as { aiDetails: AIErrorDetails }).aiDetails;
  }
  throw new Error("Missing aiDetails on error object");
}

describe("GroqProvider Unit Tests", () => {
  const originalEnv = process.env;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv, GROQ_API_KEY: "test-groq-key-gsk" };
    originalFetch = global.fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("1. sends Authorization header and json_object response format with 'JSON' in messages", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: ChatBodyPayload = {};

    global.fetch = jest.fn().mockImplementation(async (url, init) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = JSON.parse(init?.body as string) as ChatBodyPayload;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ greeting: "Hello from Groq", count: 42 }),
              },
            },
          ],
        }),
      } as unknown as Response;
    });

    const provider = new GroqProvider();
    const result = await provider.generateStructured("test-task", TestSchema, {
      systemPrompt: "You are a planner.",
      userPrompt: "Give me greeting.",
    });

    expect(capturedUrl).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(capturedHeaders["Authorization"]).toBe("Bearer test-groq-key-gsk");
    expect(capturedHeaders["Content-Type"]).toBe("application/json");
    expect(capturedBody.response_format).toEqual({ type: "json_object" });

    // Word "JSON" must be present in messages
    const allPromptText = capturedBody.messages?.map((m: { role: string; content: string }) => m.content).join(" ") ?? "";
    expect(allPromptText).toContain("JSON");

    expect(result).toEqual({ greeting: "Hello from Groq", count: 42 });
  });

  it("2. classifies 401 as non-retryable invalid key error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"error":{"message":"Invalid API Key","type":"invalid_request_error"}}',
      headers: new Headers(),
    } as unknown as Response);

    const provider = new GroqProvider();
    try {
      await provider.generateStructured("test-task", TestSchema, {
        systemPrompt: "sys",
        userPrompt: "user",
      });
      fail("Expected provider to throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.provider).toBe("groq");
      expect(details.statusCode).toBe(401);
      expect(details.type).toBe("quota");
      expect(details.retryable).toBe(false);
      expect(details.message).toContain("invalid API key");
    }
  });

  it("3. classifies 429 and captures retry-after header", async () => {
    const headers = new Headers();
    headers.set("retry-after", "12");

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => '{"error":{"message":"Rate limit reached"}}',
      headers,
    } as unknown as Response);

    const provider = new GroqProvider();
    try {
      await provider.generateStructured("test-task", TestSchema, {
        systemPrompt: "sys",
        userPrompt: "user",
      });
      fail("Expected provider to throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.provider).toBe("groq");
      expect(details.statusCode).toBe(429);
      expect(details.type).toBe("quota");
      expect(details.retryable).toBe(false);
      expect(details.message).toContain("retry-after: 12s");
    }
  });

  it("4. classifies 500 / 503 server errors as retryable transient errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
      headers: new Headers(),
    } as unknown as Response);

    const provider = new GroqProvider();
    try {
      await provider.generateStructured("test-task", TestSchema, {
        systemPrompt: "sys",
        userPrompt: "user",
      });
      fail("Expected provider to throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.provider).toBe("groq");
      expect(details.statusCode).toBe(503);
      expect(details.type).toBe("transient");
      expect(details.retryable).toBe(true);
    }
  });

  it("5. classifies schema and JSON parse failures with type 'schema'", async () => {
    // Malformed JSON returned by LLM
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "not valid json {" } }],
      }),
    } as unknown as Response);

    const provider = new GroqProvider();
    try {
      await provider.generateStructured("test-task", TestSchema, {
        systemPrompt: "sys",
        userPrompt: "user",
      });
      fail("Expected provider to throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.provider).toBe("groq");
      expect(details.type).toBe("schema");
      expect(details.retryable).toBe(true);
    }

    // Schema mismatch (missing count)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ greeting: "Hello" }) } }],
      }),
    } as unknown as Response);

    try {
      await provider.generateStructured("test-task", TestSchema, {
        systemPrompt: "sys",
        userPrompt: "user",
      });
      fail("Expected provider to throw");
    } catch (err: unknown) {
      const details = getAiDetails(err);
      expect(details.provider).toBe("groq");
      expect(details.type).toBe("schema");
      expect(details.retryable).toBe(true);
      expect(details.message).toContain("schema validation failed");
    }
  });

  it("6. parses SSE streaming responses with delta chunks and abort support", async () => {
    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"Plan "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"your "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"event"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const encoder = new TextEncoder();
    let chunkIndex = 0;

    const mockReadableStream = {
      getReader: () => ({
        read: async () => {
          if (chunkIndex >= sseChunks.length) {
            return { done: true, value: undefined };
          }
          const chunk = encoder.encode(sseChunks[chunkIndex++]);
          return { done: false, value: chunk };
        },
      }),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: mockReadableStream,
    } as unknown as Response);

    const provider = new GroqProvider();
    const collectedChunks: string[] = [];

    const fullResult = await provider.streamCompletion(
      { systemPrompt: "sys", userPrompt: "user" },
      (delta) => collectedChunks.push(delta)
    );

    expect(collectedChunks).toEqual(["Plan ", "your ", "event"]);
    expect(fullResult).toBe("Plan your event");
  });
});
