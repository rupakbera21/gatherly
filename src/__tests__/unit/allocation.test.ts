/**
 * allocation.test.ts
 *
 * Verifies Hare-Niemeyer (Largest Remainder) budget allocation method:
 * 1. The sum of allocated category amounts EXACTLY equals the total budget minor units.
 * 2. Zero drift or rounding error across arbitrary weights and amounts.
 * 3. Handles edge cases: zero budget, zero weights, single category, large budgets.
 * 4. Property-based verification across 500 randomized runs.
 */

import { allocateBudget } from "@/domain/allocation";

describe("Hare-Niemeyer Budget Allocation Engine", () => {
  it("guarantees sum(allocated) === totalBudgetMinor exactly for standard wedding categories", () => {
    const totalBudgetMinor = 2500000; // $25,000.00
    const categories = [
      { id: "venue", weight: 35 },
      { id: "catering", weight: 30 },
      { id: "photo", weight: 15 },
      { id: "decor", weight: 12 },
      { id: "music", weight: 8 },
    ];

    const result = allocateBudget(totalBudgetMinor, categories);
    const sum = result.reduce((acc, r) => acc + r.allocatedMinor, 0);

    expect(sum).toBe(totalBudgetMinor);
    expect(result.every((r) => r.allocatedMinor >= 0)).toBe(true);
  });

  it("handles odd numbers with remainders without losing a single cent/rupee", () => {
    const totalBudgetMinor = 100003; // 1000.03
    const categories = [
      { id: "cat1", weight: 33.33 },
      { id: "cat2", weight: 33.33 },
      { id: "cat3", weight: 33.34 },
    ];

    const result = allocateBudget(totalBudgetMinor, categories);
    const sum = result.reduce((acc, r) => acc + r.allocatedMinor, 0);

    expect(sum).toBe(totalBudgetMinor);
  });

  it("returns zeros when totalBudgetMinor is 0", () => {
    const categories = [
      { id: "cat1", weight: 50 },
      { id: "cat2", weight: 50 },
    ];
    const result = allocateBudget(0, categories);
    expect(result.every((r) => r.allocatedMinor === 0)).toBe(true);
  });

  it("distributes equally when all category weights are 0", () => {
    const totalBudgetMinor = 1000;
    const categories = [
      { id: "cat1", weight: 0 },
      { id: "cat2", weight: 0 },
      { id: "cat3", weight: 0 },
      { id: "cat4", weight: 0 },
    ];
    const result = allocateBudget(totalBudgetMinor, categories);
    const sum = result.reduce((acc, r) => acc + r.allocatedMinor, 0);
    expect(sum).toBe(totalBudgetMinor);
    expect(result[0]?.allocatedMinor).toBe(250);
  });

  it("property test: holds exactly for 500 randomized trials", () => {
    for (let i = 0; i < 500; i++) {
      const budget = Math.floor(Math.random() * 10000000); // 0 to 100,000.00
      const count = Math.floor(Math.random() * 8) + 1; // 1 to 8 categories
      const categories = Array.from({ length: count }, (_, idx) => ({
        id: `cat_${idx}`,
        weight: Math.random() * 100,
      }));

      const result = allocateBudget(budget, categories);
      const sum = result.reduce((acc, r) => acc + r.allocatedMinor, 0);
      expect(sum).toBe(budget);
    }
  });
});
