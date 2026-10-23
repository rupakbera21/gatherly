/**
 * @module store
 * @purpose Client-side persistent event plan store using Zustand.
 *          Single source of truth for all events, budgets, timelines, vendors, and ideas.
 *          Implements data minimisation (browser-only localStorage), patch reducer with undo/redo,
 *          safe schema validation on hydrate (never crashes on corrupt data),
 *          and 512KB capped JSON import/export.
 * @rubric Security & Efficiency – Browser persistence, data minimisation, no accounts.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import {
  applyPatch,
  PlanPatch,
} from "@/domain/patches";
import {
  EventPlan,
  EventPlanSchema,
  EventProfile,
} from "@/domain/types";
import { logger } from "@/services/logger";

export interface PlanHistoryEntry {
  patch: PlanPatch;
  inversePatch: PlanPatch;
  timestamp: string;
}

export interface GatherlyStoreState {
  events: Record<string, EventPlan>;
  currentEventId: string | null;
  undoStacks: Record<string, PlanHistoryEntry[]>;
  redoStacks: Record<string, PlanHistoryEntry[]>;
  storageNotice: string | null;

  // Actions
  setCurrentEventId: (id: string | null) => void;
  createEvent: (profile: EventProfile) => string;
  updateProfile: (id: string, updates: Partial<EventProfile>) => void;
  duplicateEvent: (id: string) => string | null;
  deleteEvent: (id: string) => void;
  deleteAllData: () => void;
  setPlan: (plan: EventPlan) => void;
  applyPatchToPlan: (id: string, patch: PlanPatch) => boolean;
  undo: (id: string) => boolean;
  redo: (id: string) => boolean;
  exportPlanJson: (id: string) => string | null;
  importPlanJson: (jsonStr: string) => { success: boolean; eventId?: string; error?: string };
  clearStorageNotice: () => void;
}

const StoreVersionSchema = z.object({
  version: z.number().default(1),
  events: z.record(EventPlanSchema),
  currentEventId: z.string().nullable().default(null),
});

export const useGatherlyStore = create<GatherlyStoreState>()(
  persist(
    (set, get) => ({
      events: {},
      currentEventId: null,
      undoStacks: {},
      redoStacks: {},
      storageNotice: null,

      setCurrentEventId: (id) => set({ currentEventId: id }),

      createEvent: (profile) => {
        const id = profile.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        const newPlan: EventPlan = {
          id,
          profile: { ...profile, id },
          budgetCategories: [],
          milestones: [],
          vendors: [],
          ideas: [],
          createdAt: now,
          updatedAt: now,
          aiProviderBadge: "gemini",
        };

        set((state) => ({
          events: { ...state.events, [id]: newPlan },
          currentEventId: id,
          undoStacks: { ...state.undoStacks, [id]: [] },
          redoStacks: { ...state.redoStacks, [id]: [] },
        }));

        return id;
      },

      updateProfile: (id, updates) => {
        set((state) => {
          const plan = state.events[id];
          if (!plan) return state;

          const updatedProfile: EventProfile = { ...plan.profile, ...updates };
          return {
            events: {
              ...state.events,
              [id]: {
                ...plan,
                profile: updatedProfile,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      duplicateEvent: (id) => {
        const state = get();
        const original = state.events[id];
        if (!original) return null;

        const newId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();

        const duplicated: EventPlan = {
          ...original,
          id: newId,
          profile: {
            ...original.profile,
            id: newId,
            title: `${original.profile.title} (Copy)`,
          },
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({
          events: { ...s.events, [newId]: duplicated },
          currentEventId: newId,
        }));

        return newId;
      },

      deleteEvent: (id) => {
        set((state) => {
          const nextEvents = { ...state.events };
          delete nextEvents[id];

          const nextUndo = { ...state.undoStacks };
          delete nextUndo[id];

          const nextRedo = { ...state.redoStacks };
          delete nextRedo[id];

          const nextCurrent =
            state.currentEventId === id
              ? Object.keys(nextEvents)[0] || null
              : state.currentEventId;

          return {
            events: nextEvents,
            currentEventId: nextCurrent,
            undoStacks: nextUndo,
            redoStacks: nextRedo,
          };
        });
      },

      deleteAllData: () => {
        set({
          events: {},
          currentEventId: null,
          undoStacks: {},
          redoStacks: {},
          storageNotice: "All local plan data has been permanently cleared.",
        });
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("gatherly_plans_v1");
        }
      },

      setPlan: (plan) => {
        set((state) => ({
          events: { ...state.events, [plan.id]: plan },
          currentEventId: plan.id,
        }));
      },

      applyPatchToPlan: (id, patch) => {
        const state = get();
        const plan = state.events[id];
        if (!plan) return false;

        const { nextPlan, inversePatch } = applyPatch(plan, patch);
        if (!inversePatch) return false;

        const currentUndo = state.undoStacks[id] || [];
        const newEntry: PlanHistoryEntry = {
          patch,
          inversePatch,
          timestamp: new Date().toISOString(),
        };

        set((s) => ({
          events: { ...s.events, [id]: nextPlan },
          undoStacks: {
            ...s.undoStacks,
            [id]: [...currentUndo.slice(-49), newEntry], // Cap undo stack at 50
          },
          redoStacks: { ...s.redoStacks, [id]: [] }, // Clear redo on new action
        }));

        return true;
      },

      undo: (id) => {
        const state = get();
        const plan = state.events[id];
        const undoStack = state.undoStacks[id] || [];
        if (!plan || undoStack.length === 0) return false;

        const lastEntry = undoStack[undoStack.length - 1];
        if (!lastEntry) return false;

        const { nextPlan } = applyPatch(plan, lastEntry.inversePatch);
        const nextUndo = undoStack.slice(0, -1);
        const currentRedo = state.redoStacks[id] || [];

        set((s) => ({
          events: { ...s.events, [id]: nextPlan },
          undoStacks: { ...s.undoStacks, [id]: nextUndo },
          redoStacks: { ...s.redoStacks, [id]: [...currentRedo, lastEntry] },
        }));

        return true;
      },

      redo: (id) => {
        const state = get();
        const plan = state.events[id];
        const redoStack = state.redoStacks[id] || [];
        if (!plan || redoStack.length === 0) return false;

        const lastRedo = redoStack[redoStack.length - 1];
        if (!lastRedo) return false;

        const { nextPlan } = applyPatch(plan, lastRedo.patch);
        const nextRedo = redoStack.slice(0, -1);
        const currentUndo = state.undoStacks[id] || [];

        set((s) => ({
          events: { ...s.events, [id]: nextPlan },
          redoStacks: { ...s.redoStacks, [id]: nextRedo },
          undoStacks: { ...s.undoStacks, [id]: [...currentUndo, lastRedo] },
        }));

        return true;
      },

      exportPlanJson: (id) => {
        const state = get();
        const plan = state.events[id];
        if (!plan) return null;
        return JSON.stringify(plan, null, 2);
      },

      importPlanJson: (jsonStr) => {
        // Enforce 512KB hard cap on client import
        if (new TextEncoder().encode(jsonStr).length > 512 * 1024) {
          return { success: false, error: "Import file exceeds 512 KB limit." };
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const validation = EventPlanSchema.safeParse(parsed);
          if (!validation.success) {
            return {
              success: false,
              error: `Schema validation failed: ${validation.error.issues.map((i) => i.message).join(", ")}`,
            };
          }

          const importedPlan = validation.data;
          // Generate fresh ID to prevent colliding with existing plans
          const newId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const planWithNewId: EventPlan = {
            ...importedPlan,
            id: newId,
            profile: { ...importedPlan.profile, id: newId },
            updatedAt: new Date().toISOString(),
          };

          set((s) => ({
            events: { ...s.events, [newId]: planWithNewId },
            currentEventId: newId,
          }));

          return { success: true, eventId: newId };
        } catch (err) {
          return {
            success: false,
            error: `Invalid JSON format: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      },

      clearStorageNotice: () => set({ storageNotice: null }),
    }),
    {
      name: "gatherly_plans_v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        try {
          // Validate existing storage with Zod
          const result = StoreVersionSchema.safeParse(state);
          if (!result.success) {
            logger.warn("Corrupted plan storage detected during hydration, safe reset applied");
            state.events = {};
            state.currentEventId = null;
            state.storageNotice = "Previous plan storage was invalid and was safely reset.";
          }
        } catch {
          state.events = {};
          state.currentEventId = null;
          state.storageNotice = "Could not read previous plans. Started with a fresh storage.";
        }
      },
    }
  )
);
