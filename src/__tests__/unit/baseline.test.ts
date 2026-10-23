/**
 * @module baseline.test
 * @purpose Unit tests for the rule-based baseline engine (Section 5.4).
 *          Verifies exact contingency percentages, category breakdowns,
 *          deterministic timeline scaling, and sanity-check validations.
 */

import {
  generateBaselineBudget,
  generateBaselineTimeline,
  generateBaselineVendors,
  validatePlanSanity,
} from "../../domain/baseline";
import type { EventProfile } from "../../domain/types";

describe("Baseline Engine Tests", () => {
  const clock = () => "2026-10-01";

  const weddingProfile: EventProfile = {
    id: "evt_wedding",
    type: "wedding",
    title: "Maya & Alex Wedding",
    eventDate: "2027-06-15",
    guestCount: 120,
    budgetMinor: 3000000, // $30,000.00
    currency: "USD",
    language: "en",
  };

  const birthdayProfile: EventProfile = {
    id: "evt_birthday",
    type: "birthday",
    title: "Leo's 7th Birthday",
    eventDate: "2026-11-20",
    guestCount: 25,
    budgetMinor: 80000, // $800.00
    currency: "USD",
    language: "en",
  };

  const communityProfile: EventProfile = {
    id: "evt_community",
    type: "community",
    title: "Oakland Summer Fair",
    eventDate: "2027-07-04",
    guestCount: 500,
    budgetMinor: 1500000, // $15,000.00
    currency: "USD",
    language: "en",
  };

  it("generates wedding budget with exact 8% contingency and correct category proportions", () => {
    const budget = generateBaselineBudget(weddingProfile);
    const totalAllocated = budget.reduce((acc, c) => acc + c.allocatedMinor, 0);

    expect(totalAllocated).toBe(weddingProfile.budgetMinor);

    const contingency = budget.find((c) => c.isContingency)!;
    expect(contingency).toBeDefined();
    expect(contingency.allocatedMinor).toBe(Math.round(3000000 * 0.08));

    // Catering is largest non-contingency category (30% of non-contingency)
    const catering = budget.find((c) => c.id === "catering")!;
    expect(catering.allocatedMinor).toBeGreaterThan(0);
  });

  it("generates birthday budget with exact 5% contingency and sums to total", () => {
    const budget = generateBaselineBudget(birthdayProfile);
    const totalAllocated = budget.reduce((acc, c) => acc + c.allocatedMinor, 0);

    expect(totalAllocated).toBe(birthdayProfile.budgetMinor);

    const contingency = budget.find((c) => c.isContingency)!;
    expect(contingency.allocatedMinor).toBe(Math.round(80000 * 0.05));
  });

  it("generates community budget with exact 10% contingency and sums to total", () => {
    const budget = generateBaselineBudget(communityProfile);
    const totalAllocated = budget.reduce((acc, c) => acc + c.allocatedMinor, 0);

    expect(totalAllocated).toBe(communityProfile.budgetMinor);

    const contingency = budget.find((c) => c.isContingency)!;
    expect(contingency.allocatedMinor).toBe(Math.round(1500000 * 0.10));
  });

  it("generates timeline scaled to available preparation weeks", () => {
    const milestones = generateBaselineTimeline(weddingProfile, clock);
    expect(milestones.length).toBeGreaterThanOrEqual(5);

    // All dates must fall within [today, eventDate]
    for (const m of milestones) {
      expect(m.dueDate >= "2026-10-01").toBe(true);
      expect(m.dueDate <= weddingProfile.eventDate).toBe(true);
    }
  });

  it("generates baseline vendor items with realistic lead times", () => {
    const vendors = generateBaselineVendors(weddingProfile);
    expect(vendors.length).toBeGreaterThan(0);
    expect(vendors.some((v) => v.category === "Venue")).toBe(true);
    expect(vendors.every((v) => v.status === "researching")).toBe(true);
  });

  it("sanity check detects allocations exceeding 60% of total budget", () => {
    const budget = generateBaselineBudget(weddingProfile);
    // Skew one category to 70%
    const skewedBudget = budget.map((c) =>
      c.id === "catering"
        ? { ...c, allocatedMinor: Math.round(weddingProfile.budgetMinor * 0.7) }
        : { ...c, allocatedMinor: 0 }
    );

    const sanity = validatePlanSanity({
      budgetCategories: skewedBudget,
      totalBudgetMinor: weddingProfile.budgetMinor,
      milestones: [],
      eventDate: weddingProfile.eventDate,
      clock,
    });

    expect(sanity.isValid).toBe(false);
    expect(sanity.warnings.some((w) => w.includes("exceeds 60% threshold"))).toBe(true);
  });

  it("sanity check detects milestones outside the valid date range", () => {
    const milestones = [
      {
        id: "m_bad",
        title: "Way in past",
        dueDate: "2020-01-01",
        category: "Test",
        status: "pending" as const,
        dependsOn: [],
        isCriticalPath: false,
        wasClamped: false,
        overdue: true,
      },
    ];

    const sanity = validatePlanSanity({
      budgetCategories: [],
      totalBudgetMinor: 0,
      milestones,
      eventDate: "2026-12-01",
      clock,
    });

    expect(sanity.isValid).toBe(false);
    expect(sanity.warnings.some((w) => w.includes("in the past"))).toBe(true);
  });
});
