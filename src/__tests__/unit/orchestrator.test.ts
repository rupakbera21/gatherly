/**
 * @module orchestrator.test
 * @purpose Unit tests for AI Orchestrator failure ladder, circuit breaker,
 *          transient retries, schema repair, caching, and fallback logic.
 *          Tests all scenarios specified in Section 9 with injected fake providers.
 */

import { z } from "zod";
import { resetCircuit, tripCircuit } from "../../services/ai/circuit-breaker";
import { AIOrchestrator } from "../../services/ai/orchestrator";
import {
  AIErrorDetails,
  AIProviderName,
  LLMProvider,
  PromptPayload,
} from "../../services/ai/types";

class FakeProvider implements LLMProvider {
  callCount = 0;
  promptsReceived: PromptPayload[] = [];

  constructor(
    readonly name: AIProviderName,
    public handler?: (callNumber: number, prompt: PromptPayload) => Promise<unknown>
  ) {}

  async generateStructured<T>(
    _task: string,
    _schema: z.ZodType<T>,
    prompt: PromptPayload
  ): Promise<T> {
    this.callCount++;
    this.promptsReceived.push(prompt);

    if (this.handler) {
      return (await this.handler(this.callCount, prompt)) as T;
    }
    return { status: "ok" } as unknown as T;
  }
}

function createErrorWithDetails(details: AIErrorDetails): Error {
  const err = new Error(details.message);
  (err as unknown as { aiDetails: AIErrorDetails }).aiDetails = details;
  return err;
}

const SimpleSchema = z.object({
  message: z.string(),
});

describe("AI Orchestrator Unit Tests", () => {
  beforeEach(async () => {
    await resetCircuit("gemini");
    await resetCircuit("groq");
  });

  it("1. succeeds on primary provider (Gemini) when healthy", async () => {
    const fakeGemini = new FakeProvider("gemini", async () => ({
      message: "Hello from **Gemini**",
    }));
    const fakeGroq = new FakeProvider("groq");

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeGemini,
      fallbackProvider: fakeGroq,
      enableCache: false,
    });

    const result = await orchestrator.execute({
      task: "test-task",
      schema: SimpleSchema,
      prompt: { systemPrompt: "sys", userPrompt: "user" },
    });

    expect(result.provider).toBe("gemini");
    // Verifies markdown cleaning: **Gemini** -> Gemini
    expect(result.data.message).toBe("Hello from Gemini");
    expect(fakeGemini.callCount).toBe(1);
    expect(fakeGroq.callCount).toBe(0);
  });

  it("2. quota error falls back immediately to Groq without retries", async () => {
    const fakeGemini = new FakeProvider("gemini", async () => {
      throw createErrorWithDetails({
        type: "quota",
        provider: "gemini",
        message: "Gemini quota exhausted (RESOURCE_EXHAUSTED)",
        retryable: false,
      });
    });

    const fakeGroq = new FakeProvider("groq", async () => ({
      message: "Backup output from Groq",
    }));

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeGemini,
      fallbackProvider: fakeGroq,
      enableCache: false,
    });

    const result = await orchestrator.execute({
      task: "test-task",
      schema: SimpleSchema,
      prompt: { systemPrompt: "sys", userPrompt: "user" },
    });

    expect(result.provider).toBe("groq");
    expect(result.data.message).toBe("Backup output from Groq");
    // MUST NOT waste retries on quota error
    expect(fakeGemini.callCount).toBe(1);
    expect(fakeGroq.callCount).toBe(1);
  });

  it("3. transient error retries with backoff then succeeds", async () => {
    let attempts = 0;
    const fakeGemini = new FakeProvider("gemini", async () => {
      attempts++;
      if (attempts === 1) {
        throw createErrorWithDetails({
          type: "transient",
          provider: "gemini",
          message: "503 Service Unavailable",
          retryable: true,
        });
      }
      return { message: "Recovered on attempt 2" };
    });

    const fakeGroq = new FakeProvider("groq");

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeGemini,
      fallbackProvider: fakeGroq,
      enableCache: false,
    });

    const result = await orchestrator.execute({
      task: "test-task",
      schema: SimpleSchema,
      prompt: { systemPrompt: "sys", userPrompt: "user" },
    });

    expect(result.provider).toBe("gemini");
    expect(result.data.message).toBe("Recovered on attempt 2");
    expect(fakeGemini.callCount).toBe(2);
    expect(fakeGroq.callCount).toBe(0);
  });

  it("4. schema failure triggers repair attempt then succeeds or falls back", async () => {
    let geminiAttempts = 0;
    const fakeGemini = new FakeProvider("gemini", async (_num, prompt) => {
      geminiAttempts++;
      if (geminiAttempts === 1) {
        throw createErrorWithDetails({
          type: "schema",
          provider: "gemini",
          message: "Missing field 'message'",
          retryable: true,
        });
      }
      // Check repair prompt was included
      expect(prompt.userPrompt).toContain("IMPORTANT REPAIR REQUEST");
      return { message: "Corrected schema response" };
    });

    const fakeGroq = new FakeProvider("groq");

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeGemini,
      fallbackProvider: fakeGroq,
      enableCache: false,
    });

    const result = await orchestrator.execute({
      task: "test-task",
      schema: SimpleSchema,
      prompt: { systemPrompt: "sys", userPrompt: "initial prompt" },
    });

    expect(result.provider).toBe("gemini");
    expect(result.data.message).toBe("Corrected schema response");
    expect(geminiAttempts).toBe(2);
  });

  it("5. both providers fail throws clean typed error", async () => {
    const fakeGemini = new FakeProvider("gemini", async () => {
      throw createErrorWithDetails({
        type: "quota",
        provider: "gemini",
        message: "Gemini quota dead",
        retryable: false,
      });
    });

    const fakeGroq = new FakeProvider("groq", async () => {
      throw createErrorWithDetails({
        type: "transient",
        provider: "groq",
        message: "Groq 500 error",
        retryable: true,
      });
    });

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeGemini,
      fallbackProvider: fakeGroq,
      enableCache: false,
    });

    await expect(
      orchestrator.execute({
        task: "test-task",
        schema: SimpleSchema,
        prompt: { systemPrompt: "sys", userPrompt: "user" },
      })
    ).rejects.toThrow("Generation failed on both primary and backup providers");
  });

  it("6. skips provider directly when circuit breaker is tripped", async () => {
    await tripCircuit("gemini", 60);

    const fakeGemini = new FakeProvider("gemini");
    const fakeGroq = new FakeProvider("groq", async () => ({
      message: "Direct fallback without touching dead Gemini",
    }));

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeGemini,
      fallbackProvider: fakeGroq,
      enableCache: false,
    });

    const result = await orchestrator.execute({
      task: "test-task",
      schema: SimpleSchema,
      prompt: { systemPrompt: "sys", userPrompt: "user" },
    });

    expect(result.provider).toBe("groq");
    expect(fakeGemini.callCount).toBe(0); // Gemini was skipped!
    expect(fakeGroq.callCount).toBe(1);
  });

  it("7. in-flight request coalescing prevents duplicate concurrent calls", async () => {
    let geminiCalls = 0;
    const fakeGemini = new FakeProvider("gemini", async () => {
      geminiCalls++;
      await new Promise((r) => setTimeout(r, 50));
      return { message: "Concurrent result" };
    });

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeGemini,
      enableCache: true,
    });

    const params = {
      task: "test-coalesce",
      schema: SimpleSchema,
      prompt: { systemPrompt: "sys", userPrompt: "user" },
      profileSubset: { id: "123" },
    };

    // Fire 3 simultaneous requests with identical parameters
    const [r1, r2, r3] = await Promise.all([
      orchestrator.execute(params),
      orchestrator.execute(params),
      orchestrator.execute(params),
    ]);

    expect(r1.data.message).toBe("Concurrent result");
    expect(r2.data.message).toBe("Concurrent result");
    expect(r3.data.message).toBe("Concurrent result");
    // Coalesced to exactly 1 provider call
    expect(geminiCalls).toBe(1);
  });
});
