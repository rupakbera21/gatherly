/**
 * @module timeline.test
 * @purpose Unit tests for milestone scheduling engine.
 *          Verifies clamping, cycle detection, topological sorting,
 *          critical path calculation, and overdue status.
 */

import { processTimeline } from "../../domain/timeline";

describe("Timeline Engine Tests", () => {
  const fixedClock = () => "2026-10-01";
  const eventDate = "2026-11-26"; // 8 weeks away

  it("converts weeks-before-event to calendar dates", () => {
    const inputs = [
      { id: "m1", title: "Book venue", targetWeeksBefore: 6 },
      { id: "m2", title: "Send invites", targetWeeksBefore: 4 },
      { id: "m3", title: "Final walk-through", targetWeeksBefore: 1 },
    ];

    const result = processTimeline(inputs, eventDate, fixedClock);
    expect(result.hasCycle).toBe(false);
    expect(result.milestones).toHaveLength(3);

    // 8 weeks - 6 weeks = 2 weeks from 2026-10-01 => 2026-10-15
    const m1 = result.milestones.find((m) => m.id === "m1")!;
    expect(m1.dueDate).toBe("2026-10-15");
    expect(m1.wasClamped).toBe(false);
  });

  it("clamps milestone dates before today to today and flags them", () => {
    const inputs = [
      // 12 weeks before event would be before 2026-10-01 (around 2026-09-03)
      { id: "m_past", title: "Earliest planning", targetWeeksBefore: 12 },
    ];

    const result = processTimeline(inputs, eventDate, fixedClock);
    const m = result.milestones.find((x) => x.id === "m_past")!;
    expect(m.dueDate).toBe("2026-10-01"); // Clamped to today
    expect(m.wasClamped).toBe(true);
  });

  it("clamps milestone dates after eventDate to eventDate and flags them", () => {
    const inputs = [
      { id: "m_after", title: "Post event wrapup", dueDate: "2026-12-05" },
    ];

    const result = processTimeline(inputs, eventDate, fixedClock);
    const m = result.milestones.find((x) => x.id === "m_after")!;
    expect(m.dueDate).toBe(eventDate);
    expect(m.wasClamped).toBe(true);
  });

  it("topologically sorts dependent milestones correctly", () => {
    // Chain: A -> B -> C (C depends on B, B depends on A)
    const inputs = [
      { id: "C", title: "Event rehearsals", targetWeeksBefore: 1, dependsOn: ["B"] },
      { id: "A", title: "Select theme", targetWeeksBefore: 7 },
      { id: "B", title: "Book venue", targetWeeksBefore: 5, dependsOn: ["A"] },
    ];

    const result = processTimeline(inputs, eventDate, fixedClock);
    expect(result.hasCycle).toBe(false);

    const aIdx = result.topologicalOrder.indexOf("A");
    const bIdx = result.topologicalOrder.indexOf("B");
    const cIdx = result.topologicalOrder.indexOf("C");

    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(cIdx);
  });

  it("detects dependency cycles and reports cycle nodes", () => {
    // Cycle: A -> B -> C -> A
    const inputs = [
      { id: "A", title: "Task A", dueDate: "2026-10-10", dependsOn: ["C"] },
      { id: "B", title: "Task B", dueDate: "2026-10-15", dependsOn: ["A"] },
      { id: "C", title: "Task C", dueDate: "2026-10-20", dependsOn: ["B"] },
      { id: "D", title: "Independent Task", dueDate: "2026-10-25" },
    ];

    const result = processTimeline(inputs, eventDate, fixedClock);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodes.length).toBeGreaterThanOrEqual(3);
    expect(result.cycleNodes).toContain("A");
    expect(result.cycleNodes).toContain("B");
    expect(result.cycleNodes).toContain("C");
  });

  it("computes the critical path accurately on a DAG", () => {
    // Two branches:
    // Path 1: start -> m1 -> m2 -> end (length 4)
    // Path 2: start -> m3 -> end (length 3)
    const inputs = [
      { id: "start", title: "Kickoff", targetWeeksBefore: 7 },
      { id: "m1", title: "Step 1", targetWeeksBefore: 5, dependsOn: ["start"] },
      { id: "m2", title: "Step 2", targetWeeksBefore: 3, dependsOn: ["m1"] },
      { id: "m3", title: "Short alternative", targetWeeksBefore: 4, dependsOn: ["start"] },
      { id: "end", title: "Final launch", targetWeeksBefore: 1, dependsOn: ["m2", "m3"] },
    ];

    const result = processTimeline(inputs, eventDate, fixedClock);
    expect(result.hasCycle).toBe(false);
    expect(result.criticalPathIds).toEqual(["start", "m1", "m2", "end"]);

    const endMilestone = result.milestones.find((m) => m.id === "end")!;
    expect(endMilestone.isCriticalPath).toBe(true);

    const m3Milestone = result.milestones.find((m) => m.id === "m3")!;
    expect(m3Milestone.isCriticalPath).toBe(false);
  });

  it("marks past uncompleted milestones as overdue", () => {
    const todayClock = () => "2026-10-20";
    const inputs = [
      { id: "m_pending_past", title: "Overdue task", dueDate: "2026-10-10", status: "pending" as const },
      { id: "m_completed_past", title: "Finished task", dueDate: "2026-10-10", status: "completed" as const },
      { id: "m_future", title: "Upcoming task", dueDate: "2026-10-25", status: "pending" as const },
    ];

    const result = processTimeline(inputs, eventDate, todayClock);
    const overdue = result.milestones.find((m) => m.id === "m_pending_past")!;
    const completed = result.milestones.find((m) => m.id === "m_completed_past")!;
    const future = result.milestones.find((m) => m.id === "m_future")!;

    expect(overdue.overdue).toBe(true);
    expect(completed.overdue).toBe(false);
    expect(future.overdue).toBe(false);
  });
});
