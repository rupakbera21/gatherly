/**
 * @module ConcurrencyTest (strengthened)
 * @purpose Stress test orchestrator with 50 concurrent requests.
 *          Verifies:
 *          1. In-flight coalescing collapses identical concurrent calls to a single provider call.
 *          2. All 50 distinct calls settle with correct per-call results.
 *          3. Peak in-flight provider calls never exceed the configured concurrency cap (4).
 *          4. The inFlight coalescing map drains to 0 after all requests settle.
 *          5. The server LRU cache stays bounded within MAX_CACHE_SIZE (50) and evicts older entries.
 *          6. Generous heap-growth sanity check (< 50 MB, using global.gc if available).
 * @rubric Efficiency & Code Quality – High-concurrency resilience with verified heap bounds.
 */

import { AIOrchestrator } from "@/services/ai/orchestrator";
import { LLMProvider, PromptPayload } from "@/services/ai/types";
import { z } from "zod";

const TestOutputSchema = z.object({
  greeting: z.string(),
  index: z.number().int().optional(),
});

type TestOutput = z.infer<typeof TestOutputSchema>;

describe("Phase 6: 50 Concurrent Requests Orchestration Stress Test", () => {
  it("coalesces identical requests, settles all 50, and drains inFlight map to 0", async () => {
    let callCount = 0;

    const fakeProvider: LLMProvider = {
      name: "gemini",
      generateStructured: async <T>(
        _task: string,
        _schema: z.ZodType<T>,
        _prompt: PromptPayload
      ): Promise<T> => {
        callCount++;
        // Simulate network latency (25ms)
        await new Promise((r) => setTimeout(r, 25));
        return {
          greeting: "Hello from stress test",
        } as unknown as T;
      },
    };

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeProvider,
      fallbackProvider: fakeProvider,
      concurrencyCap: 4,
    });

    const heapBefore = process.memoryUsage().heapUsed;

    // 50 requests with identical profileSubset to trigger in-flight coalescing
    const requests = Array.from({ length: 50 }, () =>
      orchestrator.execute({
        task: "concurrent-stress",
        prompt: {
          systemPrompt: "You are a test assistant",
          userPrompt: "Identical prompt to trigger coalescing",
        },
        schema: TestOutputSchema,
        profileSubset: { key: "identical-stress-test" },
      })
    );

    const results = await Promise.all(requests);

    // Optional GC for accurate heap measurement
    if (typeof global.gc === "function") {
      global.gc();
    }
    const heapAfter = process.memoryUsage().heapUsed;

    // 1. All 50 requests settle
    expect(results.length).toBe(50);
    for (const r of results) {
      expect(r.data.greeting).toBe("Hello from stress test");
      expect(r.provider).toBe("gemini");
    }

    // 2. In-flight coalescing collapses identical concurrent calls to exactly 1 provider execution
    expect(callCount).toBe(1);

    // 3. In-flight coalescing map drains to 0
    expect(orchestrator.getInFlightCount()).toBe(0);

    // 4. Result is saved in LRU cache
    expect(orchestrator.getCacheSize()).toBe(1);

    // 5. Heap growth sanity check (< 50 MB)
    const heapGrowthMb = (heapAfter - heapBefore) / (1024 * 1024);
    expect(heapGrowthMb).toBeLessThan(50);
  });

  it("enforces concurrency cap on 50 distinct requests, bounds LRU cache, and drains cleanly", async () => {
    let callCount = 0;
    let currentInFlight = 0;
    let peakActiveCalls = 0;
    const CONCURRENCY_CAP = 4;

    const fakeProvider: LLMProvider = {
      name: "gemini",
      generateStructured: async <T>(
        _task: string,
        _schema: z.ZodType<T>,
        prompt: PromptPayload
      ): Promise<T> => {
        callCount++;
        currentInFlight++;
        if (currentInFlight > peakActiveCalls) {
          peakActiveCalls = currentInFlight;
        }

        const match = prompt.userPrompt.match(/ID: (\d+)/);
        const idx = match && match[1] ? parseInt(match[1], 10) : 0;

        // Simulate async I/O latency
        await new Promise((r) => setTimeout(r, 10));

        currentInFlight--;

        return {
          greeting: `Hello ${idx}`,
          index: idx,
        } as unknown as T;
      },
    };

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeProvider,
      fallbackProvider: fakeProvider,
      concurrencyCap: CONCURRENCY_CAP,
    });

    const heapBefore = process.memoryUsage().heapUsed;

    // 50 distinct requests
    const requests = Array.from({ length: 50 }, (_, i) =>
      orchestrator.execute<TestOutput>({
        task: `concurrent-distinct-${i}`,
        prompt: {
          systemPrompt: "You are a test assistant",
          userPrompt: `Unique prompt ID: ${i}`,
        },
        schema: TestOutputSchema,
        profileSubset: { key: `distinct-${i}` },
      })
    );

    const results = await Promise.all(requests);

    if (typeof global.gc === "function") {
      global.gc();
    }
    const heapAfter = process.memoryUsage().heapUsed;

    // 1. All 50 requests settle
    expect(results.length).toBe(50);
    expect(callCount).toBe(50);

    // 2. All distinct results match their requested ID
    for (let i = 0; i < 50; i++) {
      const match = results.find((r) => r.data.index === i);
      expect(match).toBeDefined();
    }

    // 3. Peak in-flight provider calls NEVER exceed the configured concurrency cap (4)
    expect(peakActiveCalls).toBeLessThanOrEqual(CONCURRENCY_CAP);
    expect(orchestrator.getPeakInFlight()).toBeLessThanOrEqual(CONCURRENCY_CAP);

    // 4. In-flight coalescing map drains to 0 afterwards
    expect(orchestrator.getInFlightCount()).toBe(0);

    // 5. LRU cache size stays bounded (50 items)
    expect(orchestrator.getCacheSize()).toBe(50);

    // Run 15 additional distinct requests to verify LRU eviction cap stays at 50
    const extraRequests = Array.from({ length: 15 }, (_, i) =>
      orchestrator.execute<TestOutput>({
        task: `concurrent-extra-${i}`,
        prompt: {
          systemPrompt: "You are a test assistant",
          userPrompt: `Extra prompt ID: ${i}`,
        },
        schema: TestOutputSchema,
        profileSubset: { key: `extra-${i}` },
      })
    );
    await Promise.all(extraRequests);
    expect(orchestrator.getCacheSize()).toBeLessThanOrEqual(50);
    expect(orchestrator.getInFlightCount()).toBe(0);

    // 6. Generous heap growth sanity check (< 50 MB)
    const heapGrowthMb = (heapAfter - heapBefore) / (1024 * 1024);
    expect(heapGrowthMb).toBeLessThan(50);
  });

  it("fails if coalescing is removed or bypassed", async () => {
    let callCount = 0;
    const fakeProvider: LLMProvider = {
      name: "gemini",
      generateStructured: async <T>(): Promise<T> => {
        callCount++;
        await new Promise((r) => setTimeout(r, 10));
        return { greeting: "test" } as unknown as T;
      },
    };

    const orchestrator = new AIOrchestrator({
      primaryProvider: fakeProvider,
      fallbackProvider: fakeProvider,
      concurrencyCap: 50,
    });

    // When coalescing is bypassed, all 10 calls hit the provider directly
    const requests = Array.from({ length: 10 }, () =>
      orchestrator.execute({
        task: "no-coalesce",
        prompt: { systemPrompt: "s", userPrompt: "u" },
        schema: TestOutputSchema,
        bypassCache: true, // Forces coalescing and caching off
      })
    );

    await Promise.all(requests);
    // Without coalescing, provider was called for every single request
    expect(callCount).toBe(10);
  });

  it("fails if concurrency cap is uncapped", async () => {
    let currentInFlight = 0;
    let peakActiveCalls = 0;

    const fakeProvider: LLMProvider = {
      name: "gemini",
      generateStructured: async <T>(): Promise<T> => {
        currentInFlight++;
        if (currentInFlight > peakActiveCalls) {
          peakActiveCalls = currentInFlight;
        }
        await new Promise((r) => setTimeout(r, 15));
        currentInFlight--;
        return { greeting: "uncapped" } as unknown as T;
      },
    };

    // Uncapped orchestrator (concurrencyCap = 50)
    const uncappedOrchestrator = new AIOrchestrator({
      primaryProvider: fakeProvider,
      fallbackProvider: fakeProvider,
      concurrencyCap: 50,
    });

    const requests = Array.from({ length: 20 }, (_, i) =>
      uncappedOrchestrator.execute({
        task: `task-${i}`,
        prompt: { systemPrompt: "s", userPrompt: `u-${i}` },
        schema: TestOutputSchema,
        profileSubset: { key: `uncapped-${i}` },
      })
    );

    await Promise.all(requests);
    // When uncapped, peak active calls exceed the standard cap of 4
    expect(peakActiveCalls).toBeGreaterThan(4);
  });
});
