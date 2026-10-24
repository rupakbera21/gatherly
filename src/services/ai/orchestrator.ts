/**
 * @module ai/orchestrator
 * @purpose Core GenAI Orchestrator with Failure Ladder, Circuit Breaker,
 *          LRU Caching, In-flight Request Coalescing, Output Cleaning,
 *          and Schema Repair (Sections 5.1 - 5.5).
 * @rubric GenAI Architecture & Efficiency – Robust resilience, fallback ladder, and caching.
 */

import { z } from "zod";
import { buildCacheKey } from "@/domain/hash";
import { logger } from "../logger";
import { isCircuitOpen, tripCircuit } from "./circuit-breaker";
import { cleanStructuredStrings } from "./cleaner";
import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";
import {
  AIErrorDetails,
  AIProviderName,
  GenerationOptions,
  LLMProvider,
  PromptPayload,
} from "./types";

interface CacheEntry<T> {
  data: T;
  provider: AIProviderName;
  timestamp: number;
}

export interface OrchestrationResult<T> {
  data: T;
  provider: AIProviderName;
  cached: boolean;
  latencyMs: number;
}

export interface OrchestratorOptions {
  primaryProvider?: LLMProvider;
  fallbackProvider?: LLMProvider;
  enableCache?: boolean;
  concurrencyCap?: number;
}

class ConcurrencyLimiter {
  private active = 0;
  private peak = 0;
  private queue: (() => void)[] = [];

  constructor(private cap: number) {}

  get activeCount(): number {
    return this.active;
  }

  get peakCount(): number {
    return this.peak;
  }

  async acquire(): Promise<() => void> {
    if (this.active < this.cap) {
      this.active++;
      if (this.active > this.peak) this.peak = this.active;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          this.active--;
          const next = this.queue.shift();
          if (next) {
            this.active++;
            if (this.active > this.peak) this.peak = this.active;
            next();
          }
        }
      };
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        let released = false;
        resolve(() => {
          if (!released) {
            released = true;
            this.active--;
            const next = this.queue.shift();
            if (next) {
              this.active++;
              if (this.active > this.peak) this.peak = this.active;
              next();
            }
          }
        });
      });
    });
  }
}

export class AIOrchestrator {
  private primary: LLMProvider;
  private fallback: LLMProvider;
  private enableCache: boolean;
  private limiter: ConcurrencyLimiter;

  // In-memory LRU cache: max 50 entries, 10-minute TTL
  private lruCache = new Map<string, CacheEntry<unknown>>();
  private readonly MAX_CACHE_SIZE = 50;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  // In-flight request coalescing map
  private inFlight = new Map<string, Promise<OrchestrationResult<unknown>>>();

  constructor(options: OrchestratorOptions = {}) {
    this.primary = options.primaryProvider || new GeminiProvider();
    this.fallback = options.fallbackProvider || new GroqProvider();
    this.enableCache = options.enableCache ?? true;
    this.limiter = new ConcurrencyLimiter(options.concurrencyCap ?? 4);
  }

  getInFlightCount(): number {
    return this.inFlight.size;
  }

  getCacheSize(): number {
    return this.lruCache.size;
  }

  getActiveProviderCalls(): number {
    return this.limiter.activeCount;
  }

  getPeakInFlight(): number {
    return this.limiter.peakCount;
  }

  private getFromCache<T>(key: string): CacheEntry<T> | null {
    if (!this.enableCache) return null;
    const entry = this.lruCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.lruCache.delete(key);
      return null;
    }

    // Refresh LRU order (delete & re-insert)
    this.lruCache.delete(key);
    this.lruCache.set(key, entry as CacheEntry<unknown>);
    return entry;
  }

  private setInCache<T>(key: string, data: T, provider: AIProviderName): void {
    if (!this.enableCache) return;
    if (this.lruCache.size >= this.MAX_CACHE_SIZE) {
      // Evict oldest entry (first key in insertion order)
      const oldestKey = this.lruCache.keys().next().value;
      if (oldestKey) {
        this.lruCache.delete(oldestKey);
      }
    }
    this.lruCache.set(key, { data, provider, timestamp: Date.now() });
  }

  /**
   * Execute task through the failure ladder:
   * 1. Check in-flight coalescing & cache
   * 2. Try primary (Gemini) unless circuit breaker is open
   * 3. Classify errors: quota -> trip circuit breaker, fall back immediately
   * 4. Transient error -> retry with backoff, then fall back
   * 5. Schema error -> attempt 1 repair prompt, then fall back
   * 6. Try fallback (Groq)
   * 7. Clean output strings, cache, and return
   */
  async execute<T>(params: {
    task: string;
    schema: z.ZodType<T>;
    prompt: PromptPayload;
    profileSubset?: Record<string, unknown>;
    language?: string;
    promptVersion?: string;
    bypassCache?: boolean;
    opts?: GenerationOptions;
  }): Promise<OrchestrationResult<T>> {
    const startTime = Date.now();
    const language = params.language || "en";
    const promptVersion = params.promptVersion || "v1";

    // 1. Build cache key for coalescing & caching
    let cacheKey = "";
    if (params.profileSubset && !params.bypassCache) {
      cacheKey = await buildCacheKey({
        task: params.task,
        profileSubset: params.profileSubset,
        language,
        promptVersion,
      });

      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        logger.info("AI Cache Hit", { task: params.task, provider: cached.provider });
        return {
          data: cached.data,
          provider: cached.provider,
          cached: true,
          latencyMs: Date.now() - startTime,
        };
      }

      // In-flight coalescing check
      const ongoing = this.inFlight.get(cacheKey);
      if (ongoing) {
        logger.info("Coalescing in-flight AI request", { task: params.task });
        return ongoing as Promise<OrchestrationResult<T>>;
      }
    }

    const executionPromise = this.runLadder<T>(params, startTime);

    if (cacheKey) {
      this.inFlight.set(cacheKey, executionPromise as Promise<OrchestrationResult<unknown>>);
      executionPromise
        .then((res) => {
          this.setInCache(cacheKey, res.data, res.provider);
        })
        .finally(() => {
          this.inFlight.delete(cacheKey);
        });
    }

    return executionPromise;
  }

  private async runLadder<T>(
    params: {
      task: string;
      schema: z.ZodType<T>;
      prompt: PromptPayload;
      opts?: GenerationOptions;
    },
    startTime: number
  ): Promise<OrchestrationResult<T>> {
    const release = await this.limiter.acquire();
    try {
      let lastError: Error | null = null;
      let providerUsed: AIProviderName | null = null;
      let resultData: T | null = null;

      // STEP 1: Check Primary Provider Circuit Breaker
      const isPrimaryOpen = await isCircuitOpen(this.primary.name);

    if (!isPrimaryOpen) {
      try {
        resultData = await this.tryWithRetriesAndRepair(
          this.primary,
          params.task,
          params.schema,
          params.prompt,
          params.opts
        );
        providerUsed = this.primary.name;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const aiDetails = (err as { aiDetails?: AIErrorDetails })?.aiDetails;

        if (aiDetails?.type === "quota") {
          // Trip circuit breaker immediately for 60s
          await tripCircuit(this.primary.name, 60);
          logger.warn("Primary quota exhausted, failing over to backup immediately", {
            task: params.task,
            err: lastError.message,
          });
        } else {
          logger.warn("Primary failed after retries, failing over to backup", {
            task: params.task,
            err: lastError.message,
          });
        }
      }
    } else {
      logger.info("Primary circuit breaker is open, skipping directly to fallback", {
        task: params.task,
      });
    }

    // STEP 2: Fallback Provider (Groq)
    if (!resultData) {
      const isFallbackOpen = await isCircuitOpen(this.fallback.name);
      if (isFallbackOpen) {
        throw new Error(
          `All AI providers are currently unavailable (circuit breakers open). Last error: ${lastError?.message || "Unavailable"}`
        );
      }

      try {
        resultData = await this.tryWithRetriesAndRepair(
          this.fallback,
          params.task,
          params.schema,
          params.prompt,
          params.opts
        );
        providerUsed = this.fallback.name;
        logger.info("Fallback provider succeeded", {
          task: params.task,
          provider: this.fallback.name,
        });
      } catch (fallbackErr: unknown) {
        const fbError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
        const fbDetails = (fallbackErr as { aiDetails?: AIErrorDetails })?.aiDetails;

        if (fbDetails?.type === "quota") {
          await tripCircuit(this.fallback.name, 60);
        }

        logger.error("Both AI providers failed", {
          task: params.task,
          primaryError: lastError?.message,
          fallbackError: fbError.message,
        });

        throw new Error(
          `Generation failed on both primary and backup providers. ${fbError.message}`
        );
      }
    }

      // STEP 3: Clean output strings
      const cleaned = cleanStructuredStrings(resultData);

      return {
        data: cleaned,
        provider: providerUsed || "gemini",
        cached: false,
        latencyMs: Date.now() - startTime,
      };
    } finally {
      release();
    }
  }

  /**
   * Run provider with up to 2 retries for transient errors and 1 repair for schema errors.
   */
  private async tryWithRetriesAndRepair<T>(
    provider: LLMProvider,
    task: string,
    schema: z.ZodType<T>,
    prompt: PromptPayload,
    opts?: GenerationOptions
  ): Promise<T> {
    const maxRetries = 2;
    let attempt = 0;
    let currentPrompt = prompt;

    while (attempt <= maxRetries) {
      try {
        return await provider.generateStructured(task, schema, currentPrompt, opts);
      } catch (err: unknown) {
        const details = (err as { aiDetails?: AIErrorDetails })?.aiDetails;

        // Quota error: NO RETRIES! Fail immediately so orchestrator switches provider
        if (details?.type === "quota") {
          throw err;
        }

        // Schema validation error: Attempt 1 repair prompt with error message
        if (details?.type === "schema" && attempt === 0) {
          logger.warn("Attempting schema repair prompt", { task, provider: provider.name });
          currentPrompt = {
            systemPrompt: prompt.systemPrompt,
            userPrompt: `${prompt.userPrompt}\n\nIMPORTANT REPAIR REQUEST: Your previous JSON response failed validation: ${details.message}. Return ONLY corrected valid JSON strictly matching the requested schema.`,
          };
          attempt++;
          continue;
        }

        // Transient error (timeout / 429 / 5xx): retry with exponential backoff + jitter
        if (details?.type === "transient" && attempt < maxRetries) {
          attempt++;
          const jitter = Math.random() * 200;
          const delay = Math.pow(2, attempt) * 500 + jitter;
          logger.warn(`Transient error, retrying attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms`, {
            task,
            provider: provider.name,
          });
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Non-retryable or retries exhausted
        throw err;
      }
    }

    throw new Error(`Exhausted retries on provider ${provider.name}`);
  }
}
