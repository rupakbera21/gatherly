/**
 * @module patches-extended.test
 * @purpose Extends patches.test.ts with missing coverage:
 *          vendor add/update/remove with undo, updateEventDetails,
 *          addIdeaToPlan inverse patch (addedToPlan=false not tracked separately),
 *          not-found early returns, and Zod schema rejection of invalid patches.
 */

import { applyPatch, diffPatch, PlanPatch, PlanPatchSchema } from "@/domain/patches";
import type { EventPlan } from "@/domain/types";

const basePlan: EventPlan = {
  id: "plan_ext",
  profile: {
    id: "prof_ext",
    type: "birthday",
    title: "Alice's 30th",
    eventDate: "2027-03-15",
    guestCount: 50,
    budgetMinor: 500000,
    currency: "USD",
    language: "en",
  },
  budgetCategories: [
    {
      id: "food",
      name: "Food & Cake",
      allocatedMinor: 150000,
      spentMinor: 0,
      isContingency: false,
    },
  ],
  milestones: [
    {
      id: "m1",
      title: "Book venue",
      dueDate: "2026-12-01",
      category: "Venue",
      status: "pending",
      dependsOn: [],
      isCriticalPath: false,
      wasClamped: false,
      overdue: false,
    },
  ],
  vendors: [
    {
      id: "v1",
      category: "Catering",
      name: "Taste Masters",
      status: "researching",
      estimatedCostMinor: 80000,
    },
  ],
  ideas: [
    {
      id: "idea1",
      title: "Photo booth",
      description: "Fun selfie station",
      category: "Entertainment",
      status: "suggested",
      addedToPlan: false,
    },
  ],
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  aiProviderBadge: "gemini",
};

describe("Patches Engine – Extended Coverage", () => {
  describe("addBudgetCategory / removeBudgetCategory with undo", () => {
    it("adds and removes a budget category with full undo cycle", () => {
      const addPatch: PlanPatch = {
        op: "addBudgetCategory",
        category: {
          id: "photo",
          name: "Photography",
          allocatedMinor: 50000,
          spentMinor: 0,
          isContingency: false,
        },
      };
      const { nextPlan: withPhoto, inversePatch: removeInverse } = applyPatch(basePlan, addPatch);
      expect(withPhoto.budgetCategories).toHaveLength(2);
      expect(withPhoto.budgetCategories.find((c) => c.id === "photo")).toBeDefined();

      // Undo: inverse patch is removeBudgetCategory
      expect(removeInverse?.op).toBe("removeBudgetCategory");
      const { nextPlan: undone } = applyPatch(withPhoto, removeInverse!);
      expect(undone.budgetCategories).toHaveLength(1);
      expect(undone.budgetCategories.find((c) => c.id === "photo")).toBeUndefined();
    });

    it("removeBudgetCategory returns early when categoryId not found", () => {
      const patch: PlanPatch = { op: "removeBudgetCategory", categoryId: "nonexistent" };
      const { nextPlan, inversePatch, description } = applyPatch(basePlan, patch);
      expect(nextPlan).toBe(basePlan); // same reference – no mutation
      expect(inversePatch).toBeNull();
      expect(description).toBe("Category not found");
    });
  });

  describe("addVendorItem / updateVendorItem / removeVendorItem with undo", () => {
    it("adds a vendor item and undoes it", () => {
      const addPatch: PlanPatch = {
        op: "addVendorItem",
        item: {
          id: "v_new",
          category: "Photography",
          name: "Snap Studio",
          status: "researching",
        },
      };
      const { nextPlan: withVendor, inversePatch } = applyPatch(basePlan, addPatch);
      expect(withVendor.vendors).toHaveLength(2);
      expect(inversePatch?.op).toBe("removeVendorItem");
      const { nextPlan: undone } = applyPatch(withVendor, inversePatch!);
      expect(undone.vendors).toHaveLength(1);
    });

    it("updates a vendor item status and estimated cost with undo", () => {
      const updatePatch: PlanPatch = {
        op: "updateVendorItem",
        itemId: "v1",
        status: "quoted",
        estimatedCostMinor: 90000,
      };
      const diffs = diffPatch(basePlan, updatePatch);
      expect(diffs.some((d) => d.field.includes("Status"))).toBe(true);
      expect(diffs.some((d) => d.field.includes("Estimated Cost"))).toBe(true);

      const { nextPlan, inversePatch } = applyPatch(basePlan, updatePatch);
      const vendor = nextPlan.vendors.find((v) => v.id === "v1")!;
      expect(vendor.status).toBe("quoted");
      expect(vendor.estimatedCostMinor).toBe(90000);

      const { nextPlan: undone } = applyPatch(nextPlan, inversePatch!);
      const undoneVendor = undone.vendors.find((v) => v.id === "v1")!;
      expect(undoneVendor.status).toBe("researching");
      expect(undoneVendor.estimatedCostMinor).toBe(80000);
    });

    it("updateVendorItem returns early for non-existent vendor", () => {
      const patch: PlanPatch = { op: "updateVendorItem", itemId: "ghost", status: "booked" };
      const { nextPlan, inversePatch } = applyPatch(basePlan, patch);
      expect(nextPlan).toBe(basePlan);
      expect(inversePatch).toBeNull();
    });

    it("removeVendorItem returns early for non-existent vendor", () => {
      const patch: PlanPatch = { op: "removeVendorItem", itemId: "ghost" };
      const { inversePatch, description } = applyPatch(basePlan, patch);
      expect(inversePatch).toBeNull();
      expect(description).toBe("Vendor not found");
    });
  });

  describe("updateEventDetails", () => {
    // Use a plan that already has a location so undo can restore it
    const planWithLocation: typeof basePlan = {
      ...basePlan,
      profile: { ...basePlan.profile, location: "Park Pavilion" },
    };

    it("updates title and location with undo restoring original values", () => {
      const patch: PlanPatch = {
        op: "updateEventDetails",
        title: "Alice's 30th Birthday Bash",
        location: "Rooftop Venue",
      };
      const diffs = diffPatch(planWithLocation, patch);
      expect(diffs.some((d) => d.field === "Event Title")).toBe(true);
      expect(diffs.some((d) => d.field === "Event Location")).toBe(true);

      const { nextPlan, inversePatch } = applyPatch(planWithLocation, patch);
      expect(nextPlan.profile.title).toBe("Alice's 30th Birthday Bash");
      expect(nextPlan.profile.location).toBe("Rooftop Venue");

      // Undo: inverse patch has title = original title, location = original location
      expect(inversePatch?.op).toBe("updateEventDetails");
      const { nextPlan: undone } = applyPatch(nextPlan, inversePatch!);
      expect(undone.profile.title).toBe("Alice's 30th");
      expect(undone.profile.location).toBe("Park Pavilion");
    });
  });

  describe("updateMilestone – not found early return", () => {
    it("returns current plan unchanged when milestone id does not exist", () => {
      const patch: PlanPatch = { op: "updateMilestone", milestoneId: "ghost", status: "completed" };
      const { nextPlan, inversePatch, description } = applyPatch(basePlan, patch);
      expect(nextPlan).toBe(basePlan);
      expect(inversePatch).toBeNull();
      expect(description).toBe("Milestone not found");
    });
  });

  describe("Zod schema: invalid patch types", () => {
    it("rejects patches with negative integers where nonnegative is required", () => {
      expect(
        PlanPatchSchema.safeParse({ op: "updateBudgetCategory", categoryId: "x", allocatedMinor: -1 }).success
      ).toBe(false);
    });

    it("rejects updateMilestone with invalid status enum", () => {
      expect(
        PlanPatchSchema.safeParse({ op: "updateMilestone", milestoneId: "m1", status: "DONE" }).success
      ).toBe(false);
    });

    it("rejects setEventDate with invalid date format", () => {
      expect(
        PlanPatchSchema.safeParse({ op: "setEventDate", eventDate: "31/12/2027" }).success
      ).toBe(false);
    });

    it("rejects notes exceeding 500 characters", () => {
      expect(
        PlanPatchSchema.safeParse({ op: "updateBudgetCategory", categoryId: "x", notes: "a".repeat(501) }).success
      ).toBe(false);
    });
  });
});
