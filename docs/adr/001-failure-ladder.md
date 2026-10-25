# ADR 001: AI Failure Ladder & Circuit Breaker Architecture

## Status
Accepted

## Context
Event planning applications require high reliability, predictable latency, and graceful degradation. Commercial LLM APIs (Google Gemini, GroqCloud) can experience intermittent timeouts, rate-limit 429 errors (`RESOURCE_EXHAUSTED`), schema non-compliance, or catastrophic regional outages. If an LLM call fails completely, users should never see a generic blank screen or crash, but should receive a high-quality, mathematically sound baseline plan. Furthermore, during high traffic or burst retries, multiple identical concurrent requests should not hammer upstream LLM APIs, and quota-exhausted providers must be temporarily bypassed to prevent latency pileup.

## Decision
We implement a multi-tiered **Failure Ladder Orchestrator** in `src/services/ai/orchestrator.ts`:
1. **Request Coalescing:** Identical in-flight generation requests share a single pending Promise via an in-memory execution map. If 50 users or components request the same task simultaneously, only 1 LLM request is dispatched.
2. **Tiered Caching:** Successful responses are cached in an LRU memory cache (max 50 entries) using SHA-256 keys of the prompt and parameters.
3. **Primary Provider (Gemini 3.5 Flash):** Fast, cost-efficient primary model (`gemini-3.5-flash`) with strict JSON response schemas.
4. **Circuit Breaker:** Powered by Upstash Redis (`src/services/ai/circuit-breaker.ts`) with an in-memory fallback. If a provider throws a quota exhaustion (`RESOURCE_EXHAUSTED` / 429), model/permission errors (403/404), or fails consecutively, the circuit opens for 60 seconds. Subsequent calls instantly fail over to the secondary provider without waiting for network timeouts.
5. **Transient Retries & Schema Repair:** Transient 5xx or network errors retry up to 2 times with jittered exponential backoff (1s base). If JSON parsing or Zod validation fails, a targeted repair prompt is executed once before failing over.
6. **Secondary Provider (GroqCloud):** If the primary fails or its circuit is open, execution falls over to Groq (`qwen/qwen3.8-27b`).
7. **Rule-Based Baseline (Zero-LLM Degraded Mode):** If both Gemini and Groq fail or credentials are unavailable, the orchestrator invokes deterministic, domain-specific rule-based fallback generators (`src/domain/baseline.ts`).

## Consequences
- **Positive:** System exhibits 100% uptime even under complete AI provider outages.
- **Positive:** Latency during primary outages drops from multi-second timeouts to zero-second instant bypass via circuit breaker.
- **Positive:** Zero financial waste or rate-limit exhaustion during concurrent identical calls due to promise coalescing.
- **Trade-off:** Rule-based fallbacks lack the nuanced creative wording of LLMs, but guarantee structural and mathematical correctness (100% budget sum match, acyclic timeline DAG).
