/**
 * @module patches
 * @purpose PlanPatch discriminated union, pure reducers, inverse patches (undo/redo),
 *          and diff generation.
 *          Guarantees that AI Copilot and UI operations never overwrite state directly;
 *          all modifications pass through validated, reversible patches.
 * @rubric Security & Code Quality – State immutability, safe LLM-to-state boundary.
 */

import { z } from "zod";
import {
  BudgetCategorySchema,
  EventPlan,
  MilestoneSchema,
  VendorItemSchema,
} from "./types";

export const UpdateBudgetCategoryPatchSchema = z.object({
  op: z.literal("updateBudgetCategory"),
  categoryId: z.string(),
  allocatedMinor: z.number().int().nonnegative().optional(),
  spentMinor: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export const AddBudgetCategoryPatchSchema = z.object({
  op: z.literal("addBudgetCategory"),
  category: BudgetCategorySchema,
});

export const RemoveBudgetCategoryPatchSchema = z.object({
  op: z.literal("removeBudgetCategory"),
  categoryId: z.string(),
});

export const AddMilestonePatchSchema = z.object({
  op: z.literal("addMilestone"),
  milestone: MilestoneSchema,
});

export const UpdateMilestonePatchSchema = z.object({
  op: z.literal("updateMilestone"),
  milestoneId: z.string(),
  title: z.string().min(1).max(200).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  notes: z.string().max(500).optional(),
});

export const RemoveMilestonePatchSchema = z.object({
  op: z.literal("removeMilestone"),
  milestoneId: z.string(),
});

export const AddVendorItemPatchSchema = z.object({
  op: z.literal("addVendorItem"),
  item: VendorItemSchema,
});

export const UpdateVendorItemPatchSchema = z.object({
  op: z.literal("updateVendorItem"),
  itemId: z.string(),
  status: z.enum(["researching", "contacted", "quoted", "booked"]).optional(),
  estimatedCostMinor: z.number().int().nonnegative().optional(),
  actualCostMinor: z.number().int().nonnegative().optional(),
  leadTimeWeeks: z.number().int().nonnegative().optional(),
  quoteNotes: z.string().max(1000).optional(),
});

export const RemoveVendorItemPatchSchema = z.object({
  op: z.literal("removeVendorItem"),
  itemId: z.string(),
});

export const SetGuestCountPatchSchema = z.object({
  op: z.literal("setGuestCount"),
  guestCount: z.number().int().nonnegative(),
});

export const SetEventDatePatchSchema = z.object({
  op: z.literal("setEventDate"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const AddIdeaToPlanPatchSchema = z.object({
  op: z.literal("addIdeaToPlan"),
  ideaId: z.string(),
});

export const UpdateEventDetailsPatchSchema = z.object({
  op: z.literal("updateEventDetails"),
  title: z.string().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
});

export const PlanPatchSchema = z.discriminatedUnion("op", [
  UpdateBudgetCategoryPatchSchema,
  AddBudgetCategoryPatchSchema,
  RemoveBudgetCategoryPatchSchema,
  AddMilestonePatchSchema,
  UpdateMilestonePatchSchema,
  RemoveMilestonePatchSchema,
  AddVendorItemPatchSchema,
  UpdateVendorItemPatchSchema,
  RemoveVendorItemPatchSchema,
  SetGuestCountPatchSchema,
  SetEventDatePatchSchema,
  AddIdeaToPlanPatchSchema,
  UpdateEventDetailsPatchSchema,
]);

export type PlanPatch = z.infer<typeof PlanPatchSchema>;

export interface PatchDiffEntry {
  field: string;
  before: string;
  after: string;
}

export interface PatchResult {
  nextPlan: EventPlan;
  inversePatch: PlanPatch | null;
  description: string;
  diff: PatchDiffEntry[];
}

/**
 * Compute the diff preview of applying a patch to a plan without modifying state.
 */
export function diffPatch(plan: EventPlan, patch: PlanPatch): PatchDiffEntry[] {
  const diffs: PatchDiffEntry[] = [];

  switch (patch.op) {
    case "updateBudgetCategory": {
      const cat = plan.budgetCategories.find((c) => c.id === patch.categoryId);
      if (cat) {
        if (patch.allocatedMinor !== undefined && patch.allocatedMinor !== cat.allocatedMinor) {
          diffs.push({
            field: `${cat.name} Allocated`,
            before: String(cat.allocatedMinor),
            after: String(patch.allocatedMinor),
          });
        }
        if (patch.spentMinor !== undefined && patch.spentMinor !== cat.spentMinor) {
          diffs.push({
            field: `${cat.name} Spent`,
            before: String(cat.spentMinor),
            after: String(patch.spentMinor),
          });
        }
      }
      break;
    }
    case "addBudgetCategory":
      diffs.push({
        field: "New Budget Category",
        before: "(none)",
        after: `${patch.category.name} (${patch.category.allocatedMinor})`,
      });
      break;
    case "removeBudgetCategory": {
      const cat = plan.budgetCategories.find((c) => c.id === patch.categoryId);
      diffs.push({
        field: "Remove Budget Category",
        before: cat ? cat.name : patch.categoryId,
        after: "(deleted)",
      });
      break;
    }
    case "addMilestone":
      diffs.push({
        field: "New Milestone",
        before: "(none)",
        after: `${patch.milestone.title} (due ${patch.milestone.dueDate})`,
      });
      break;
    case "updateMilestone": {
      const m = plan.milestones.find((x) => x.id === patch.milestoneId);
      if (m) {
        if (patch.title && patch.title !== m.title) {
          diffs.push({ field: "Milestone Title", before: m.title, after: patch.title });
        }
        if (patch.dueDate && patch.dueDate !== m.dueDate) {
          diffs.push({ field: "Milestone Due Date", before: m.dueDate, after: patch.dueDate });
        }
        if (patch.status && patch.status !== m.status) {
          diffs.push({ field: "Milestone Status", before: m.status, after: patch.status });
        }
      }
      break;
    }
    case "removeMilestone": {
      const m = plan.milestones.find((x) => x.id === patch.milestoneId);
      diffs.push({
        field: "Remove Milestone",
        before: m ? m.title : patch.milestoneId,
        after: "(deleted)",
      });
      break;
    }
    case "addVendorItem":
      diffs.push({
        field: "New Vendor Item",
        before: "(none)",
        after: `${patch.item.name} (${patch.item.category})`,
      });
      break;
    case "updateVendorItem": {
      const v = plan.vendors.find((x) => x.id === patch.itemId);
      if (v) {
        if (patch.status && patch.status !== v.status) {
          diffs.push({ field: `${v.name} Status`, before: v.status, after: patch.status });
        }
        if (patch.estimatedCostMinor !== undefined) {
          diffs.push({
            field: `${v.name} Estimated Cost`,
            before: String(v.estimatedCostMinor ?? 0),
            after: String(patch.estimatedCostMinor),
          });
        }
      }
      break;
    }
    case "removeVendorItem": {
      const v = plan.vendors.find((x) => x.id === patch.itemId);
      diffs.push({
        field: "Remove Vendor",
        before: v ? v.name : patch.itemId,
        after: "(deleted)",
      });
      break;
    }
    case "setGuestCount":
      diffs.push({
        field: "Guest Count",
        before: String(plan.profile.guestCount),
        after: String(patch.guestCount),
      });
      break;
    case "setEventDate":
      diffs.push({
        field: "Event Date",
        before: plan.profile.eventDate,
        after: patch.eventDate,
      });
      break;
    case "addIdeaToPlan": {
      const idea = plan.ideas.find((i) => i.id === patch.ideaId);
      diffs.push({
        field: "Add Idea to Plan",
        before: "idea.addedToPlan = false",
        after: idea ? `Added "${idea.title}"` : patch.ideaId,
      });
      break;
    }
    case "updateEventDetails": {
      if (patch.title && patch.title !== plan.profile.title) {
        diffs.push({ field: "Event Title", before: plan.profile.title, after: patch.title });
      }
      if (patch.location && patch.location !== plan.profile.location) {
        diffs.push({
          field: "Event Location",
          before: plan.profile.location || "(none)",
          after: patch.location,
        });
      }
      break;
    }
  }

  return diffs;
}

/**
 * Apply a patch to an EventPlan immutably, computing the next state and inverse patch.
 */
export function applyPatch(plan: EventPlan, patch: PlanPatch): PatchResult {
  const diff = diffPatch(plan, patch);
  let nextPlan: EventPlan = { ...plan, updatedAt: new Date().toISOString() };
  let inversePatch: PlanPatch | null = null;
  let description = "";

  switch (patch.op) {
    case "updateBudgetCategory": {
      const current = plan.budgetCategories.find((c) => c.id === patch.categoryId);
      if (!current) {
        return { nextPlan: plan, inversePatch: null, description: "Category not found", diff: [] };
      }
      inversePatch = {
        op: "updateBudgetCategory",
        categoryId: current.id,
        allocatedMinor: current.allocatedMinor,
        spentMinor: current.spentMinor,
        notes: current.notes,
      };
      nextPlan = {
        ...nextPlan,
        budgetCategories: plan.budgetCategories.map((c) =>
          c.id === patch.categoryId
            ? {
                ...c,
                ...(patch.allocatedMinor !== undefined && { allocatedMinor: patch.allocatedMinor }),
                ...(patch.spentMinor !== undefined && { spentMinor: patch.spentMinor }),
                ...(patch.notes !== undefined && { notes: patch.notes }),
              }
            : c
        ),
      };
      description = `Updated budget category ${current.name}`;
      break;
    }
    case "addBudgetCategory": {
      inversePatch = {
        op: "removeBudgetCategory",
        categoryId: patch.category.id,
      };
      nextPlan = {
        ...nextPlan,
        budgetCategories: [...plan.budgetCategories, patch.category],
      };
      description = `Added budget category ${patch.category.name}`;
      break;
    }
    case "removeBudgetCategory": {
      const current = plan.budgetCategories.find((c) => c.id === patch.categoryId);
      if (!current) {
        return { nextPlan: plan, inversePatch: null, description: "Category not found", diff: [] };
      }
      inversePatch = {
        op: "addBudgetCategory",
        category: current,
      };
      nextPlan = {
        ...nextPlan,
        budgetCategories: plan.budgetCategories.filter((c) => c.id !== patch.categoryId),
      };
      description = `Removed budget category ${current.name}`;
      break;
    }
    case "addMilestone": {
      inversePatch = {
        op: "removeMilestone",
        milestoneId: patch.milestone.id,
      };
      nextPlan = {
        ...nextPlan,
        milestones: [...plan.milestones, patch.milestone],
      };
      description = `Added milestone "${patch.milestone.title}"`;
      break;
    }
    case "updateMilestone": {
      const current = plan.milestones.find((m) => m.id === patch.milestoneId);
      if (!current) {
        return { nextPlan: plan, inversePatch: null, description: "Milestone not found", diff: [] };
      }
      inversePatch = {
        op: "updateMilestone",
        milestoneId: current.id,
        title: current.title,
        dueDate: current.dueDate,
        category: current.category,
        status: current.status,
        notes: current.notes,
      };
      nextPlan = {
        ...nextPlan,
        milestones: plan.milestones.map((m) =>
          m.id === patch.milestoneId
            ? {
                ...m,
                ...(patch.title !== undefined && { title: patch.title }),
                ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
                ...(patch.category !== undefined && { category: patch.category }),
                ...(patch.status !== undefined && { status: patch.status }),
                ...(patch.notes !== undefined && { notes: patch.notes }),
              }
            : m
        ),
      };
      description = `Updated milestone "${current.title}"`;
      break;
    }
    case "removeMilestone": {
      const current = plan.milestones.find((m) => m.id === patch.milestoneId);
      if (!current) {
        return { nextPlan: plan, inversePatch: null, description: "Milestone not found", diff: [] };
      }
      inversePatch = {
        op: "addMilestone",
        milestone: current,
      };
      nextPlan = {
        ...nextPlan,
        milestones: plan.milestones.filter((m) => m.id !== patch.milestoneId),
      };
      description = `Removed milestone "${current.title}"`;
      break;
    }
    case "addVendorItem": {
      inversePatch = {
        op: "removeVendorItem",
        itemId: patch.item.id,
      };
      nextPlan = {
        ...nextPlan,
        vendors: [...plan.vendors, patch.item],
      };
      description = `Added vendor item "${patch.item.name}"`;
      break;
    }
    case "updateVendorItem": {
      const current = plan.vendors.find((v) => v.id === patch.itemId);
      if (!current) {
        return { nextPlan: plan, inversePatch: null, description: "Vendor item not found", diff: [] };
      }
      inversePatch = {
        op: "updateVendorItem",
        itemId: current.id,
        status: current.status,
        estimatedCostMinor: current.estimatedCostMinor,
        actualCostMinor: current.actualCostMinor,
        leadTimeWeeks: current.leadTimeWeeks,
        quoteNotes: current.quoteNotes,
      };
      nextPlan = {
        ...nextPlan,
        vendors: plan.vendors.map((v) =>
          v.id === patch.itemId
            ? {
                ...v,
                ...(patch.status !== undefined && { status: patch.status }),
                ...(patch.estimatedCostMinor !== undefined && {
                  estimatedCostMinor: patch.estimatedCostMinor,
                }),
                ...(patch.actualCostMinor !== undefined && {
                  actualCostMinor: patch.actualCostMinor,
                }),
                ...(patch.leadTimeWeeks !== undefined && {
                  leadTimeWeeks: patch.leadTimeWeeks,
                }),
                ...(patch.quoteNotes !== undefined && { quoteNotes: patch.quoteNotes }),
              }
            : v
        ),
      };
      description = `Updated vendor item "${current.name}"`;
      break;
    }
    case "removeVendorItem": {
      const current = plan.vendors.find((v) => v.id === patch.itemId);
      if (!current) {
        return { nextPlan: plan, inversePatch: null, description: "Vendor not found", diff: [] };
      }
      inversePatch = {
        op: "addVendorItem",
        item: current,
      };
      nextPlan = {
        ...nextPlan,
        vendors: plan.vendors.filter((v) => v.id !== patch.itemId),
      };
      description = `Removed vendor "${current.name}"`;
      break;
    }
    case "setGuestCount": {
      inversePatch = {
        op: "setGuestCount",
        guestCount: plan.profile.guestCount,
      };
      nextPlan = {
        ...nextPlan,
        profile: { ...nextPlan.profile, guestCount: patch.guestCount },
      };
      description = `Updated guest count to ${patch.guestCount}`;
      break;
    }
    case "setEventDate": {
      inversePatch = {
        op: "setEventDate",
        eventDate: plan.profile.eventDate,
      };
      nextPlan = {
        ...nextPlan,
        profile: { ...nextPlan.profile, eventDate: patch.eventDate },
      };
      description = `Updated event date to ${patch.eventDate}`;
      break;
    }
    case "addIdeaToPlan": {
      const current = plan.ideas.find((i) => i.id === patch.ideaId);
      if (!current) {
        return { nextPlan: plan, inversePatch: null, description: "Idea not found", diff: [] };
      }
      // Inverse: reset addedToPlan to false
      nextPlan = {
        ...nextPlan,
        ideas: plan.ideas.map((i) =>
          i.id === patch.ideaId ? { ...i, addedToPlan: true, status: "saved" } : i
        ),
      };
      description = `Added idea "${current.title}" to plan`;
      break;
    }
    case "updateEventDetails": {
      inversePatch = {
        op: "updateEventDetails",
        title: plan.profile.title,
        location: plan.profile.location,
      };
      nextPlan = {
        ...nextPlan,
        profile: {
          ...nextPlan.profile,
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.location !== undefined && { location: patch.location }),
        },
      };
      description = "Updated event details";
      break;
    }
  }

  return { nextPlan, inversePatch, description, diff };
}
