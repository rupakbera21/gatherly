/**
 * @module store.test
 * @purpose Unit tests for Zustand multi-event persistent store.
 *          Verifies event creation, duplication, deletion, undo/redo patch history,
 *          JSON import/export, and 512KB size limits.
 */

import { useGatherlyStore } from "../../store";
import { EventProfile } from "../../domain/types";

describe("Zustand Store Unit Tests", () => {
  beforeEach(() => {
    useGatherlyStore.getState().deleteAllData();
  });

  const sampleProfile: EventProfile = {
    id: "evt_test_1",
    type: "wedding",
    title: "Summer Wedding Gala",
    eventDate: "2027-08-20",
    guestCount: 150,
    budgetMinor: 4000000,
    currency: "USD",
    language: "en",
  };

  it("creates and retrieves a new event plan", () => {
    const store = useGatherlyStore.getState();
    const eventId = store.createEvent(sampleProfile);

    const state = useGatherlyStore.getState();
    const plan = state.events[eventId];
    expect(plan).toBeDefined();
    expect(plan?.profile.title).toBe("Summer Wedding Gala");
    expect(state.currentEventId).toBe(eventId);
  });

  it("duplicates an event cleanly with a fresh ID and copy title", () => {
    const store = useGatherlyStore.getState();
    const originalId = store.createEvent(sampleProfile);

    const dupId = store.duplicateEvent(originalId);
    expect(dupId).toBeDefined();
    expect(dupId).not.toBe(originalId);

    const state = useGatherlyStore.getState();
    const duplicated = state.events[dupId!];
    expect(duplicated?.profile.title).toBe("Summer Wedding Gala (Copy)");
  });

  it("deletes an event and cleans up history stacks", () => {
    const store = useGatherlyStore.getState();
    const eventId = store.createEvent(sampleProfile);

    expect(useGatherlyStore.getState().events[eventId]).toBeDefined();

    store.deleteEvent(eventId);
    const state = useGatherlyStore.getState();
    expect(state.events[eventId]).toBeUndefined();
    expect(state.undoStacks[eventId]).toBeUndefined();
  });

  it("applies patches and allows undo and redo", () => {
    const store = useGatherlyStore.getState();
    const eventId = store.createEvent(sampleProfile);

    // Apply guest count change
    const success = store.applyPatchToPlan(eventId, {
      op: "setGuestCount",
      guestCount: 200,
    });
    expect(success).toBe(true);

    let state = useGatherlyStore.getState();
    expect(state.events[eventId]?.profile.guestCount).toBe(200);
    expect(state.undoStacks[eventId]).toHaveLength(1);

    // Undo
    const undoSuccess = store.undo(eventId);
    expect(undoSuccess).toBe(true);
    state = useGatherlyStore.getState();
    expect(state.events[eventId]?.profile.guestCount).toBe(150);
    expect(state.redoStacks[eventId]).toHaveLength(1);

    // Redo
    const redoSuccess = store.redo(eventId);
    expect(redoSuccess).toBe(true);
    state = useGatherlyStore.getState();
    expect(state.events[eventId]?.profile.guestCount).toBe(200);
  });

  it("exports and imports valid JSON plans safely", () => {
    const store = useGatherlyStore.getState();
    const eventId = store.createEvent(sampleProfile);

    const json = store.exportPlanJson(eventId);
    expect(json).toBeDefined();

    // Import into fresh store
    const importResult = store.importPlanJson(json!);
    expect(importResult.success).toBe(true);
    expect(importResult.eventId).toBeDefined();

    const state = useGatherlyStore.getState();
    expect(state.events[importResult.eventId!]).toBeDefined();
  });

  it("rejects oversized JSON imports exceeding 512 KB", () => {
    const store = useGatherlyStore.getState();
    const hugeString = "X".repeat(550 * 1024);

    const result = store.importPlanJson(hugeString);
    expect(result.success).toBe(false);
    expect(result.error).toContain("512 KB limit");
  });
});
