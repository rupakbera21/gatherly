# ADR 003: Deterministic Financial Math & Largest-Remainder Allocation

## Status
Accepted

## Context
Standard floating-point arithmetic (`0.1 + 0.2 === 0.30000000000000004`) in web applications leads to rounding drift, off-by-one penny errors, and broken budget balancing. For events with strict budgets (e.g., $10,000.00 across 8 categories), summing floating-point percentages frequently produces $9,999.99 or $10,000.01. Furthermore, non-deterministic rounding creates jitter in interactive sliders, frustrating users.

## Decision
1. **Integer Minor Units:** All currency values are stored as 64-bit integer minor units (cents, pence, yen, etc.) in `src/domain/money.ts`.
   - `$150.50` is stored as `15050`.
   - Currency display is formatted using `Intl.NumberFormat` with strict locale and currency code parameters.
2. **Largest-Remainder Method (Hare-Niemeyer Algorithm):**
   - Implemented in `src/domain/allocation.ts`.
   - Percentage distributions are converted to integer cents using quota floors.
   - Remaining pennies are distributed one-by-one to categories sorted by largest fractional remainder.
   - **Deterministic Tie-Breaking:** If two categories have identical remainders, ties are broken strictly by alphabetical order of category name, ensuring 100% idempotent and reproducible results.
3. **Mathematical Guarantee:**
   - $\sum \text{allocatedCategories} \equiv \text{totalBudget}$ is strictly invariant.
   - Validated across all unit and property-based test suites.

## Consequences
- **Positive:** Perfect penny-accurate accounting across all currencies (USD, EUR, GBP, JPY, INR, AUD, CAD).
- **Positive:** Zero-LLM what-if sandbox: users can adjust budget sliders and see instant, mathematically guaranteed category updates without latency or API costs.
- **Trade-off:** Percentage values stored alongside categories must be kept synchronized when user manually edits integer cents directly.
