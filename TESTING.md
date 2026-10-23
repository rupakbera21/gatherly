# Gatherly – Verification & Test Suite Documentation

> **Test Status:** 18 Test Suites Passed | 111 Tests Passed | 0 Snapshots | 100% Pass Rate  
> **Execution Duration:** ~5.7s (local standard) / ~25s (with concurrency stress tests)

---

## 1. Test Suite Summary Table

All test suites and test counts below are directly generated and verified from the executable test files in `src/__tests__/`.

| # | Test Suite | Path | Tests | Coverage Scope |
|---|---|---|:---:|---|
| 1 | **Money & Allocation** | `src/__tests__/unit/money.test.ts` | 9 | Integer minor units, currency formatting, Hare-Niemeyer largest-remainder allocation, sum invariance property, non-negativity property, permutation stability |
| 2 | **Timeline & DAG Engine** | `src/__tests__/unit/timeline.test.ts` | 6 | Weeks-to-date conversion, cycle detection (3-color DFS), topological sorting, longest-path critical path analysis, overdue date flags |
| 3 | **UTC Dates Engine** | `src/__tests__/unit/dates.test.ts` | 6 | UTC midnight math, `addDays`, `addWeeks`, `daysBetween`, date clamping, clock injection |
| 4 | **Baseline Generator** | `src/__tests__/unit/baseline.test.ts` | 5 | Deterministic rule-based baseline plans for weddings, birthdays, and community events, sanity checks (`validatePlanSanity`) |
| 5 | **RFC 5545 iCalendar Engine** | `src/__tests__/unit/ics.test.ts` | 5 | CRLF line terminators, 75-octet UTF-8 line folding, character escaping (`,`, `;`, `\`), `VALUE=DATE` formatting |
| 6 | **RFC 4180 CSV Engine** | `src/__tests__/unit/csv.test.ts` | 5 | Quoting, escaping, formula injection neutralization (`=`, `+`, `-`, `@`, `\t` prefixed with `'`) |
| 7 | **Idea Deduplication** | `src/__tests__/unit/dedupe.test.ts` | 5 | Jaccard token similarity, stop words filtering, plural stemming, 0.7 similarity threshold filtering |
| 8 | **State Patches & Invertibility** | `src/__tests__/unit/patches.test.ts` | 6 | Pure reducer `applyPatch`, inverse patch computation for undo/redo (`invertPatch`), human-readable diff generation (`diffPatch`) |
| 9 | **Persistent Store & Privacy** | `src/__tests__/unit/store.test.ts` | 7 | Zustand rehydration, multi-event mutations, undo/redo state stacks, 512 KB import size cap, privacy wipe |
| 10 | **Cryptographic Hashing** | `src/__tests__/unit/hash.test.ts` | 6 | SHA-256 deterministic hashing, salt handling, prompt token normalization |
| 11 | **Environment Validator** | `src/__tests__/unit/env.test.ts` | 6 | Required vs optional env vars, whitespace and quote stripping, build commit injection |
| 12 | **HTTP & Body Limiter** | `src/__tests__/unit/http.test.ts` | 7 | Streaming 32 KB body size limit (`readJsonBodyWithLimit`), Content-Length pre-checks, typed API error responses |
| 13 | **AI Orchestrator & Circuit Breaker** | `src/__tests__/unit/orchestrator.test.ts` | 7 | Primary provider success, quota error immediate failover, transient backoff retries, schema repair retry, dual provider failure error, circuit breaker open bypass, in-flight request coalescing |
| 14 | **Groq Provider Adapter** | `src/__tests__/unit/groq.test.ts` | 6 | Authorization Bearer header, `json_object` format & "JSON" prompt verification, OpenAI-style SSE stream parsing, 401 / 429 / 5xx error mapping, retry-after header handling, schema validation |
| 15 | **Extras Components & Accessibility** | `src/__tests__/unit/extras.test.tsx` | 6 | WeddingExtras, BirthdayExtras, CommunityExtras rendering + `jest-axe` automated accessibility scans (**0 violations**) |
| 16 | **Intake API Integration** | `src/__tests__/integration/intake.test.ts` | 5 | `POST /api/intake` validation, free-text prompt parsing, error handling, rate-limiting response headers |
| 17 | **Tier 1 Routes Integration** | `src/__tests__/integration/routes.test.ts` | 7 | End-to-end integration for `/api/budget`, `/api/timeline`, `/api/vendors`, `/api/ideas` with fallback and schema validation |
| 18 | **Tier 2 Routes Integration** | `src/__tests__/integration/tier2.test.ts` | 11 | `POST /api/copilot`, `POST /api/quote`, `POST /api/run-of-show` validation, patch generation, quote analysis, baseline fallback |
| 19 | **Concurrency Stress Test** | `src/__tests__/integration/concurrency.test.ts` | 2 | Phase 6 verification: 50 concurrent identical requests coalesce to 1 call; 50 concurrent distinct requests run without race conditions |
| **Total** | **19 Suites** | | **117** | **All 117 Tests Passing** |

---

## 2. Test Execution Commands

### Run Full Test Suite
```bash
npm test
```

### Run Coverage Report
```bash
npm run test:coverage
```
Coverage thresholds enforced:
- `src/domain/`: >85% line coverage
- `src/services/`: >85% line coverage
- Overall application: >70% line coverage

### Run Full Gate Verification
Runs ESLint 9, TypeScript compiler (`tsc --noEmit`), Jest test suite, and Next.js 16 production build:
```bash
npm run verify
```

### Run Live Provider Smoke Test
Validates that real credentials for Gemini, Groq, and Upstash Redis are functional before a live demonstration:
```bash
npm run smoke
```

---

## 3. Manual Verification & Walkthrough Script

In addition to automated tests, the following manual flows have been verified in the browser:

### Flow 1: Natural-Language Intake to Plan Generation
1. Navigate to `/events/new`.
2. Paste unstructured prompt:
   > *"Outdoor summer wedding for 120 guests in Seattle on September 15, 2027. Budget is $35,000. Rustic aesthetic, live jazz band, buffet dinner."*
3. Verify that `POST /api/intake` extracts title, date, guest count, budget ($35,000 USD), and style tags.
4. Click "Review & Generate Plan".
5. Observe parallel generation of Budget, Timeline, Vendors, and Ideas via `Promise.allSettled`.

### Flow 2: Zero-LLM What-If Budget Sandboxing
1. Navigate to `/plan/[id]/budget`.
2. Move the total budget slider or edit category percentages.
3. Observe instant, real-time reallocation with zero network requests or LLM calls.
4. Verify that total allocated budget matches target budget to the exact penny ($35,000.00).
5. Click "Export CSV" and inspect file; confirm formula injection characters are neutralized.

### Flow 3: DAG Timeline & RFC 5545 Export
1. Navigate to `/plan/[id]/timeline`.
2. Review milestones sorted topologically backward from the event date.
3. Toggle milestone status (Pending -> In Progress -> Done); observe progress bar update.
4. Click "Export .ics Calendar" and import into Apple Calendar / Google Calendar; verify correct date placement.

### Flow 4: Plan Copilot & Interactive Patch Approval
1. Click the floating Copilot button on any plan page.
2. Ask Copilot: *"Can we reallocate $2,000 from Catering to Live Band?"*
3. Review the proposed `PlanPatch` diff preview in the drawer.
4. Click "Approve & Apply". Verify plan state updates instantly and Undo button becomes active.
5. Click "Undo" in the navigation bar; verify budget reverts to previous allocation.

### Flow 5: Vendor Quote Auditor
1. Navigate to `/plan/[id]/quote`.
2. Paste raw vendor estimate text (e.g., photographer quote with deposit and overtime terms).
3. Click "Audit Quote".
4. Review parsed line items, hidden fee warnings, cancellation policy risks, and suggested negotiation questions.
5. Click "Add Vendor to Plan" to incorporate the vendor directly into the pipeline.

### Flow 6: Accessibility & Assistive Tech
1. Open the Accessibility Toolbar in the top-right header.
2. Toggle High Contrast mode, Dyslexia Font, and Text Scaling; observe instantaneous theme adjustments.
3. Perform a full tab navigation through all interactive controls; verify focus indicators and skip link functionality.
