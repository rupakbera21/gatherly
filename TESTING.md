# Gatherly – Verification & Test Suite Documentation

> **Test Status:** 31 Test Suites Passed | 230 Tests Passed | 0 Snapshots | 100% Pass Rate  
> **Execution Duration:** ~6.5s (local standard) / ~25s (with concurrency stress tests)

---

## 1. Test Suite Summary Table

All test suites and test counts below are directly generated and verified from the executable test files in `src/__tests__/`.

| # | Test Suite | Path | Tests | Coverage Scope |
|---|---|---|:---:|---|
| 1 | **Tier 1 Routes Integration** | `src/__tests__/integration/routes.test.ts` | 9 | End-to-end integration for `/api/budget`, `/api/timeline`, `/api/vendors`, `/api/ideas` with fallback and schema validation |
| 2 | **Extras Components & Accessibility** | `src/__tests__/unit/extras.test.tsx` | 6 | WeddingExtras, BirthdayExtras, CommunityExtras rendering + `jest-axe` automated accessibility scans (0 violations) |
| 3 | **Profile Review Form Accessibility** | `src/__tests__/unit/review-form-a11y.test.tsx` | 7 | Zero axe violations in populated, loading, and error states; field validation; type-specific extras |
| 4 | **Copilot Drawer Accessibility** | `src/__tests__/unit/copilot-a11y.test.tsx` | 9 | Focus trapping, Escape key, dialog role, aria-live announcements, patch approval, network error handling |
| 5 | **Tier 2 Routes Integration** | `src/__tests__/integration/tier2.test.ts` | 10 | `POST /api/copilot`, `POST /api/quote`, `POST /api/run-of-show` validation, patch generation, quote analysis, baseline fallback |
| 6 | **Intake Section Accessibility** | `src/__tests__/unit/intake-a11y.test.tsx` | 9 | Zero axe violations on intake form, example chip clicking, submission flow, error alert |
| 7 | **Accessibility Toolbar** | `src/__tests__/unit/toolbar-a11y.test.tsx` | 6 | High contrast, dyslexia font, theme toggle, text scaling, zero axe violations |
| 8 | **Money & Allocation** | `src/__tests__/unit/money.test.ts` | 9 | Integer minor units, currency formatting, Hare-Niemeyer largest-remainder allocation, sum invariance |
| 9 | **Environment Validator** | `src/__tests__/unit/env.test.ts` | 8 | Required vs optional env vars, whitespace and quote stripping, build commit injection |
| 10 | **Gemini Provider Adapter** | `src/__tests__/unit/gemini.test.ts` | 12 | Structured JSON, streaming parse, 400 invalid key, 403 forbidden, 404 not found, 429 quota, 503 retry, timeout, secret key redaction |
| 11 | **RFC 4180 CSV Engine** | `src/__tests__/unit/csv.test.ts` | 5 | Quoting, escaping, formula injection neutralization (`=`, `+`, `-`, `@`, `\t` prefixed with `'`) |
| 12 | **Concurrency Stress Test** | `src/__tests__/integration/concurrency.test.ts` | 4 | 50 concurrent coalesced + 50 distinct requests, concurrency cap enforcement (peak in-flight ≤ 4), inFlight map drain to 0, LRU cache bounded to 50, and negative assertion proofs |
| 13 | **RFC 5545 iCalendar Engine** | `src/__tests__/unit/ics.test.ts` | 4 | CRLF line terminators, 75-octet UTF-8 line folding, character escaping, `VALUE=DATE` formatting |
| 14 | **State Patches Extended** | `src/__tests__/unit/patches-extended.test.ts` | 12 | Deep patch application, inversion, error handling on invalid patches, multi-patch sequences |
| 15 | **Groq Provider Adapter** | `src/__tests__/unit/groq.test.ts` | 6 | Authorization Bearer header, JSON prompt verification, OpenAI SSE stream parsing, 401/429/5xx mapping |
| 16 | **Baseline Generator** | `src/__tests__/unit/baseline.test.ts` | 7 | Deterministic rule-based baseline plans for weddings, birthdays, community events, sanity checks |
| 17 | **Timeline & DAG Engine** | `src/__tests__/unit/timeline.test.ts` | 7 | Weeks-to-date conversion, cycle detection (3-color DFS), topological sorting, critical path analysis |
| 18 | **Persistent Store & Privacy** | `src/__tests__/unit/store.test.ts` | 6 | Zustand rehydration, multi-event mutations, undo/redo stacks, 512 KB import size cap, privacy wipe |
| 19 | **Intake API Integration** | `src/__tests__/integration/intake.test.ts` | 3 | `POST /api/intake` validation, free-text prompt parsing, error handling, rate-limiting headers |
| 20 | **Structured Logger** | `src/__tests__/unit/logger.test.ts` | 11 | JSON-lines formatting, redaction of sensitive tokens, log level filtering, development mode |
| 21 | **Output Cleaner & Hygiene** | `src/__tests__/unit/cleaner.test.ts` | 19 | Stripping `<think>...</think>` blocks, reasoning tags, markdown artifacts, heading hashes, list glyphs |
| 22 | **Idea Deduplication** | `src/__tests__/unit/dedupe.test.ts` | 4 | Jaccard token similarity, stop words filtering, plural stemming, 0.7 similarity threshold filtering |
| 23 | **Rate Limiter & Fail-Open** | `src/__tests__/unit/ratelimit.test.ts` | 6 | Upstash Redis sliding window, fail-open resilience when Redis offline, 2-tier enforcement |
| 24 | **Cryptographic Hashing** | `src/__tests__/unit/hash.test.ts` | 14 | SHA-256 deterministic hashing, salt handling, prompt token normalization |
| 25 | **UTC Dates Engine** | `src/__tests__/unit/dates.test.ts` | 8 | UTC midnight math, `addDays`, `addWeeks`, `daysBetween`, date clamping, clock injection |
| 26 | **HTTP & Body Limiter** | `src/__tests__/unit/http.test.ts` | 5 | Streaming 32 KB body size limit (`readJsonBodyWithLimit`), Content-Length pre-checks, typed responses |
| 27 | **State Patches Core** | `src/__tests__/unit/patches.test.ts` | 6 | Pure reducer `applyPatch`, inverse patch computation for undo/redo (`invertPatch`), human diffs |
| 28 | **Health Verification Route** | `src/__tests__/unit/health.test.ts` | 4 | GET /api/health deploy verification, secret redaction, Upstash ping, rate limiting |
| 29 | **AI Circuit Breaker** | `src/__tests__/unit/circuit-breaker.test.ts` | 4 | In-memory trip, check, expiry, reset, Redis distributed state sync and error tolerance |
| 30 | **AI Orchestrator** | `src/__tests__/unit/orchestrator.test.ts` | 8 | Primary provider success, quota/403/404 error immediate failover to Groq, backoff retries, schema repair, coalescing |
| 31 | **Announce Accessibility Utility** | `src/__tests__/unit/announce.test.ts` | 2 | Accessible polite live-region announcements, timeout debounce, and missing DOM node fallback |
| **Total** | **31 Suites** | | **230** | **All 230 Tests Passing (100% Pass Rate)** |

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
Coverage thresholds enforced & verified:
- `src/domain/`: 94.89% lines (threshold: ≥85%) - **PASS**
- `src/services/`: 93.84% lines (threshold: ≥85%) - **PASS**
- `src/services/ai/`: 88.38% lines (threshold: ≥85%) - **PASS**
- `src/app/api/`: 87.94% lines aggregate (threshold: ≥85%) - **PASS**
- Overall application: 89.48% lines (threshold: ≥70%) - **PASS**

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
