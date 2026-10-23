/**
 * @module patches.test
 * @purpose Unit tests for PlanPatch discriminated union, pure reducer,
 *          preview diffs, and reversible undo/redo operations.
 */

import {
  applyPatch,
  diffPatch,
  PlanPatch,
  PlanPatchSchema,
} from "../../domain/patches";
import type { EventPlan } from "../../domain/types";

describe("PlanPatch Engine Tests", () => {
  const basePlan: EventPlan = {
    id: "plan_1",
    profile: {
      id: "prof_1",
      type: "wedding",
      title: "Sophie & Liam",
      eventDate: "2027-05-15",
      guestCount: 100,
      budgetMinor: 2000000,
      currency: "USD",
      language: "en",
    },
    budgetCategories: [
      { id: "venue", name: "Venue", allocatedMinor: 500000, spentMinor: 100000, isContingency: false },
      { id: "catering", name: "Catering", allocatedMinor: 800000, spentMinor: 0, isContingency: false },
    ],
    milestones: [
      {
        id: "m_1",
        title: "Book Venue",
        dueDate: "2026-12-01",
        category: "Venue",
        status: "in_progress",
        dependsOn: [],
        isCriticalPath: true,
        wasClamped: false,
        overdue: false,
      },
    ],
    vendors: [
      { id: "v_1", category: "Venue", name: "Sunset Gardens", status: "contacted", estimatedCostMinor: 450000 },
    ],
    ideas: [
      { id: "i_1", title: "Sparkler exit", description: "At 10pm", category: "General", status: "suggested", addedToPlan: false },
    ],
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    aiProviderBadge: "gemini",
  };

  it("validates valid patches and rejects invalid schemas", () => {
    const validPatch: PlanPatch = {
      op: "updateBudgetCategory",
      categoryId: "venue",
      allocatedMinor: 550000,
    };
    expect(PlanPatchSchema.safeParse(validPatch).success).toBe(true);

    // Negative budget not allowed
    const invalidPatch = {
      op: "updateBudgetCategory",
      categoryId: "venue",
      allocatedMinor: -500,
    };
    expect(PlanPatchSchema.safeParse(invalidPatch).success).toBe(false);

    // Unknown op rejected
    const unknownOp = {
      op: "deleteDatabase",
    };
    expect(PlanPatchSchema.safeParse(unknownOp).success).toBe(false);
  });

  it("generates preview diffs without mutating state", () => {
    const patch: PlanPatch = {
      op: "updateBudgetCategory",
      categoryId: "venue",
      allocatedMinor: 600000,
    };

    const diffs = diffPatch(basePlan, patch);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.field).toBe("Venue Allocated");
    expect(diffs[0]!.before).toBe("500000");
    expect(diffs[0]!.after).toBe("600000");

    // Base plan unchanged
    expect(basePlan.budgetCategories[0]!.allocatedMinor).toBe(500000);
  });

  it("applies budget patch immutably and supports exact undo", () => {
    const patch: PlanPatch = {
      op: "updateBudgetCategory",
      categoryId: "venue",
      allocatedMinor: 600000,
    };

    const { nextPlan, inversePatch } = applyPatch(basePlan, patch);
    expect(nextPlan.budgetCategories[0]!.allocatedMinor).toBe(600000);
    expect(basePlan.budgetCategories[0]!.allocatedMinor).toBe(500000); // Immutability

    // Undo via inverse patch
    expect(inversePatch).toBeDefined();
    const undone = applyPatch(nextPlan, inversePatch!);
    expect(undone.nextPlan.budgetCategories[0]!.allocatedMinor).toBe(500000);
  });

  it("supports add and remove milestone patches with undo", () => {
    const addPatch: PlanPatch = {
      op: "addMilestone",
      milestone: {
        id: "m_new",
        title: "Send Save the Dates",
        dueDate: "2026-11-15",
        category: "Invites",
        status: "pending",
        dependsOn: [],
        isCriticalPath: false,
        wasClamped: false,
        overdue: false,
      },
    };

    const { nextPlan, inversePatch } = applyPatch(basePlan, addPatch);
    expect(nextPlan.milestones).toHaveLength(2);
    expect(nextPlan.milestones[1]!.id).toBe("m_new");

    // Undo should remove it
    const undone = applyPatch(nextPlan, inversePatch!);
    expect(undone.nextPlan.milestones).toHaveLength(1);
    expect(undone.nextPlan.milestones.find((m) => m.id === "m_new")).toBeUndefined();
  });

  it("supports guest count and event date patches", () => {
    const guestPatch: PlanPatch = { op: "setGuestCount", guestCount: 150 };
    const { nextPlan: planWithGuests, inversePatch: invGuests } = applyPatch(basePlan, guestPatch);
    expect(planWithGuests.profile.guestCount).toBe(150);

    const undoneGuests = applyPatch(planWithGuests, invGuests!);
    expect(undoneGuests.nextPlan.profile.guestCount).toBe(100);

    const datePatch: PlanPatch = { op: "setEventDate", eventDate: "2027-06-20" };
    const { nextPlan: planWithDate, inversePatch: invDate } = applyPatch(basePlan, datePatch);
    expect(planWithDate.profile.eventDate).toBe("2027-06-20");

    const undoneDate = applyPatch(planWithDate, invDate!);
    expect(undoneDate.nextPlan.profile.eventDate).toBe("2027-05-15");
  });

  it("adds idea to plan seamlessly", () => {
    const patch: PlanPatch = { op: "addIdeaToPlan", ideaId: "i_1" };
    const { nextPlan } = applyPatch(basePlan, patch);
    const idea = nextPlan.ideas.find((i) => i.id === "i_1")!;
    expect(idea.addedToPlan).toBe(true);
    expect(idea.status).toBe("saved");
  });
});
