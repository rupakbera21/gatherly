# ADR 002: PlanPatch Discriminated Union & Single Source of Truth

## Status
Accepted

## Context
In an interactive event planner with multiple sub-modules (Budgets, Timelines, Vendors, Ideas, Copilot, Quote Auditor, Run-of-Show), state mutation can quickly become fragmented and buggy. Furthermore, users require:
1. Full undo/redo capability across all actions.
2. Safe proposal previews before applying changes (e.g., when Copilot suggests budget rebalancing).
3. Seamless integration between conversational suggestions (Copilot, Quote Analyzer, Ideas) and concrete plan state.
4. Privacy-first local persistence without requiring user account databases or server-side state leakage.

## Decision
1. **Single Source of Truth:** The event plan is stored exclusively client-side via a persistent Zustand store (`src/store/index.ts`) under the key `gatherly_plans_v1`. No personal data, guest names, or plan content are saved on external servers.
2. **Discriminated Union (`PlanPatch`):** All plan modifications are expressed as atomic, strongly-typed operations defined in `src/domain/patches.ts`:
   - `UPDATE_PROFILE`: Updates title, date, guest count, location, style.
   - `ADD_BUDGET_CATEGORY` / `UPDATE_BUDGET_CATEGORY` / `DELETE_BUDGET_CATEGORY`
   - `SET_TOTAL_BUDGET`: Rebalances categories deterministically.
   - `ADD_MILESTONE` / `UPDATE_MILESTONE` / `TOGGLE_MILESTONE` / `DELETE_MILESTONE`
   - `ADD_VENDOR` / `UPDATE_VENDOR` / `DELETE_VENDOR`
   - `DISMISS_IDEA` / `RESTORE_IDEA`
3. **Pure Reducer & Invertibility:**
   - Every patch is processed through a pure function: `applyPatch(plan, patch): EventPlan`.
   - For every forward patch, `invertPatch(plan, patch): PlanPatch | null` computes the exact inverse patch, enabling boundless, deterministic undo/redo stacks.
4. **Human-in-the-Loop Previews:**
   - The Copilot never silently mutates state. Instead, it outputs candidate `PlanPatch[]` objects.
   - `diffPatch(plan, patch): PatchDiff` generates a human-readable before/after summary rendered in the Copilot drawer. Users must explicitly click "Approve & Apply".

## Consequences
- **Positive:** Complete isolation of concerns; UI components, Copilot drawer, and Quote Auditor all share the same atomic mutation protocol.
- **Positive:** 100% testable without mocks—state transitions are pure mathematical functions.
- **Positive:** Full privacy compliance: zero database breaches or PII leakage risks.
- **Trade-off:** Multi-device synchronization requires manual export/import JSON files (which are capped at 512KB and schema-validated) rather than real-time cloud sync.
