# Gatherly – Submission Notes & Architectural Overview

## 1. Executive Summary

**Gatherly** is an AI-powered event planning assistant built from the ground up to solve the real-world friction of planning weddings, birthdays, and community gatherings. Rather than treating Generative AI as a brittle magic wand that directly controls application state, Gatherly employs an **Audited Co-Planner Architecture**:
1. **AI Proposes, Domain Engines Validate, Humans Approve:** LLMs provide creative suggestions, categorization, and draft timelines. Domain engines strictly govern financial math, DAG topological ordering, and calendar formatting. The human organizer retains ultimate control via interactive diff previews and one-click undo/redo.
2. **True High-Availability Failure Ladder:** Primary AI calls go to Google Gemini 3.5 Flash (default: `gemini-3.5-flash`), automatically failing over to GroqCloud (default: `qwen/qwen3.8-27b`) if the primary hits rate limits or model/permission errors (403/404), and smoothly degrading to deterministic rule-based baselines if both AI providers are unavailable.
3. **Privacy-by-Design:** All plan state is persisted locally in the user's browser via Zustand and `localStorage`. No user accounts, database backends, analytics pixels, or third-party tracking cookies exist. Sensitive guest PII is never transmitted to LLMs.

---

## 2. Key Architectural Decisions & Innovations

### A. The Failure Ladder & Circuit Breaker Pattern
Most AI wrappers fail catastrophically when an API key exhausts its quota or encounters a transient 429 error. Gatherly implements an enterprise-grade failure ladder in `src/services/ai/orchestrator.ts`:
- **Request Coalescing:** Multiple concurrent calls for the same generation task share a single in-flight Promise, eliminating redundant upstream requests.
- **Circuit Breaker:** Redis-backed (with an automatic in-memory fallback) circuit breaker that trips for 60 seconds upon receiving `RESOURCE_EXHAUSTED` or consecutive failures, preventing cascading latency.
- **Schema Repair:** If an LLM returns malformed JSON or fails Zod validation, an automatic schema-repair prompt executes before failover.
- **Rule-Based Baseline Fallback:** If both Gemini and Groq fail, Gatherly falls back to pure algorithmic baselines (`src/domain/baseline.ts`). The application **never** crashes or leaves the user stranded.

### B. Integer-Cent Minor Units & Largest-Remainder Allocation
Standard floating-point calculations cause rounding drift and off-by-one penny errors. Gatherly treats all currency as integer minor units (e.g. cents) and implements the **Hare-Niemeyer Largest-Remainder Method** (`src/domain/allocation.ts`):
- Guarantees $\sum \text{allocatedCategories} \equiv \text{totalBudget}$ without a single cent discrepancy.
- Deterministic alphabetical tie-breaking eliminates slider jitter and ensures pure reproducibility.
- Enables a **Zero-LLM What-If Sandbox** where users can drag budget sliders and see instantaneous rebalancing without consuming AI tokens or waiting for API roundtrips.

### C. Invertible State Patches (`PlanPatch`)
All state mutations follow an atomic event-sourcing paradigm (`src/domain/patches.ts`):
- Copilot, Quote Auditor, and Ideas modules output typed `PlanPatch` objects rather than mutating raw state.
- `diffPatch()` produces human-readable before-and-after change summaries.
- `invertPatch()` computes exact inverse operations, enabling boundless, deterministic Undo/Redo across all screens.

### D. DAG Backward Planning & Cycle Detection
Event planning is fundamentally backward planning from the target date:
- Milestones specify relative weeks before the event.
- Dependencies are modeled as a Directed Acyclic Graph (DAG) with 3-color DFS cycle detection.
- Critical path analysis highlights bottleneck milestones, and RFC 5545 `.ics` export enables immediate integration into Google Calendar, Apple Calendar, and Outlook with correct UTF-8 line folding and CRLF formatting.

---

## 3. Measured Performance & Verification Metrics

- **Test Suite:** 230 passed tests across 31 suites (`npm test` executes in ~6.5 seconds).
- **TypeScript & Linting:** 100% clean check with `noUncheckedIndexedAccess: true` and ESLint 9.
- **Production Build:** Next.js 16.4.2 with Turbopack, Cache Components, and Partial Prerendering (PPR) enabled.
- **Bundle & Repository Size:**
  - Non-build repository footprint: **1.07 MB** (well under the 10 MB competition limit).
  - Production static bundle: minimal First Load JS per route, zero heavy external charting libraries (custom accessible SVG visualizations).
- **Accessibility:** 100% WCAG 2.2 AA compliance verified with automated `jest-axe` tests reporting **0 violations**.

---

## 4. Security & Compliance Checklist

- [x] **Rate Limiting:** Upstash Redis sliding window with 2-tier enforcement (30 req/min general, 10 req/min generation).
- [x] **Input Sanitization:** 32 KB streaming body caps (`readJsonBodyWithLimit`) and Zod schema validation.
- [x] **Formula Injection Defense:** All CSV exports sanitize `=`, `+`, `-`, `@`, and `\t` prefixes.
- [x] **Security Headers:** Strict Content-Security-Policy (CSP), HSTS (2 years), X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Permissions-Policy.
- [x] **PII Protection:** Strict protocol forbidding transmission of personal contact information to LLM APIs.
- [x] **Privacy Wipe:** One-click "Delete all my data" completely purges local storage.

---

## 5. Verification Commands

```bash
# 1. Run full verification suite (lint + typecheck + 230 coverage-enforced tests + Next.js 16 build)
npm run verify

# 2. Run unit and integration tests with coverage
npm run test:coverage

# 3. Optional live credential smoke test
npm run smoke
```
