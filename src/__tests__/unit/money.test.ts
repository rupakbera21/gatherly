/**
 * @module money.test
 * @purpose Unit and property-based tests (fast-check) for money and allocation engines.
 *          Verifies exact integer math, zero floating point drift, largest-remainder sums,
 *          non-negativity, stability under reordering, and multi-currency exponent rules.
 */

import * as fc from "fast-check";
import {
  formatCurrency,
  fromMinorUnits,
  getCurrencyDecimals,
  parseCurrencyInput,
  toMinorUnits,
} from "../../domain/money";
import { allocateBudget } from "../../domain/allocation";

describe("Money Engine Unit Tests", () => {
  it("derives correct decimal exponents for major currencies", () => {
    expect(getCurrencyDecimals("USD")).toBe(2);
    expect(getCurrencyDecimals("EUR")).toBe(2);
    expect(getCurrencyDecimals("GBP")).toBe(2);
    expect(getCurrencyDecimals("INR")).toBe(2);
    expect(getCurrencyDecimals("JPY")).toBe(0);
    expect(getCurrencyDecimals("KRW")).toBe(0);
    expect(getCurrencyDecimals("KWD")).toBe(3);
    expect(getCurrencyDecimals("BHD")).toBe(3);
  });

  it("converts major to minor units and back without precision loss", () => {
    expect(toMinorUnits(150.75, "USD")).toBe(15075);
    expect(fromMinorUnits(15075, "USD")).toBe(150.75);

    // JPY zero decimal
    expect(toMinorUnits(5000, "JPY")).toBe(5000);
    expect(fromMinorUnits(5000, "JPY")).toBe(5000);

    // 3 decimal currency
    expect(toMinorUnits(12.345, "KWD")).toBe(12345);
    expect(fromMinorUnits(12345, "KWD")).toBe(12.345);
  });

  it("formats currency accurately with Intl.NumberFormat", () => {
    const usd = formatCurrency(250000, "USD", "en-US");
    expect(usd).toContain("2,500.00");

    const jpy = formatCurrency(50000, "JPY", "ja-JP");
    expect(jpy).toContain("50,000");

    const inr = formatCurrency(10000000, "INR", "en-IN");
    expect(inr).toContain("1,00,000.00");
  });

  it("parses user input strings safely", () => {
    expect(parseCurrencyInput("$1,250.50", "USD")).toBe(125050);
    expect(parseCurrencyInput("5,000 ¥", "JPY")).toBe(5000);
    expect(parseCurrencyInput("invalid", "USD")).toBe(0);
  });
});

describe("Allocation Engine Unit & Property Tests", () => {
  it("handles basic largest remainder distribution", () => {
    // $100.00 (10000 cents) divided into 3 equal parts
    const items = [
      { id: "a", weight: 33.33 },
      { id: "b", weight: 33.33 },
      { id: "c", weight: 33.33 },
    ];
    const res = allocateBudget(10000, items);
    const sum = res.reduce((acc, r) => acc + r.allocatedMinor, 0);
    expect(sum).toBe(10000);
    expect(res.every((r) => r.allocatedMinor >= 0)).toBe(true);
  });

  it("handles zero total budget or empty items gracefully", () => {
    expect(allocateBudget(0, [{ id: "a", weight: 50 }])).toEqual([
      { item: { id: "a", weight: 50 }, allocatedMinor: 0 },
    ]);
    expect(allocateBudget(10000, [])).toEqual([]);
  });

  // Fast-check property test 1: Allocated sum ALWAYS equals totalBudgetMinor exactly
  it("property: allocated parts always sum exactly to totalBudgetMinor", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000_000 }), // budget up to $1M in cents
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            weight: fc.float({ min: 0, max: 100, noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (totalBudget, items) => {
          const result = allocateBudget(totalBudget, items);
          const sum = result.reduce((acc, r) => acc + r.allocatedMinor, 0);
          return sum === totalBudget;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Fast-check property test 2: No allocated values are ever negative
  it("property: no allocated value is ever negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50_000_000 }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            weight: fc.float({ min: 0, max: 100, noNaN: true }),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (totalBudget, items) => {
          const result = allocateBudget(totalBudget, items);
          return result.every((r) => r.allocatedMinor >= 0 && Number.isInteger(r.allocatedMinor));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Fast-check property test 3: Deterministic tie-breaking is stable under reordering
  it("property: allocation is stable under input permutation for distinct IDs", () => {
    const items = [
      { id: "cat_1", weight: 10 },
      { id: "cat_2", weight: 20 },
      { id: "cat_3", weight: 30 },
      { id: "cat_4", weight: 40 },
    ];
    const total = 10001; // odd cent test

    const resOriginal = allocateBudget(total, items);
    const resReversed = allocateBudget(total, [...items].reverse());

    const mapOriginal = new Map(resOriginal.map((r) => [r.item.id, r.allocatedMinor]));
    const mapReversed = new Map(resReversed.map((r) => [r.item.id, r.allocatedMinor]));

    for (const [id, val] of mapOriginal.entries()) {
      expect(mapReversed.get(id)).toBe(val);
    }
  });
});
