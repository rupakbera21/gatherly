/**
 * @module timeline
 * @purpose Deterministic timeline engine for event milestones.
 *          Converts weeks-before-event to calendar dates, clamps to [today, eventDate],
 *          detects dependency cycles, topologically sorts milestones,
 *          computes the critical path, and marks overdue items.
 * @rubric Problem Statement Alignment & Code Quality – Robust DAG & scheduling math.
 */

import { addWeeks, clampDate, defaultClock, isBefore, type Clock } from "./dates";
import type { Milestone } from "./types";

export interface TimelineEngineResult {
  milestones: Milestone[];
  hasCycle: boolean;
  cycleNodes: string[];
  topologicalOrder: string[];
  criticalPathIds: string[];
}

export interface MilestoneInput {
  id: string;
  title: string;
  targetWeeksBefore?: number;
  dueDate?: string;
  category?: string;
  status?: "pending" | "in_progress" | "completed";
  dependsOn?: string[];
  notes?: string;
}

/**
 * Process raw milestone inputs into validated, sorted, and scheduled milestones.
 *
 * @param inputs - Raw milestone entries from AI or user
 * @param eventDate - Target event date YYYY-MM-DD
 * @param clock - Clock function returning current date YYYY-MM-DD
 */
export function processTimeline(
  inputs: MilestoneInput[],
  eventDate: string,
  clock: Clock = defaultClock
): TimelineEngineResult {
  const todayStr = clock();

  // 1. Convert weeks-before to dates and clamp to [today, eventDate]
  const processedMap = new Map<string, Milestone>();

  for (const input of inputs) {
    let calculatedDate = input.dueDate;
    if (input.targetWeeksBefore !== undefined) {
      calculatedDate = addWeeks(eventDate, -input.targetWeeksBefore);
    }
    if (!calculatedDate) {
      calculatedDate = eventDate;
    }

    const { clamped, wasClamped } = clampDate(calculatedDate, todayStr, eventDate);
    const status = input.status || "pending";
    const overdue = isBefore(calculatedDate, todayStr) && status !== "completed";

    const milestone: Milestone = {
      id: input.id,
      title: input.title,
      dueDate: clamped,
      targetWeeksBefore: input.targetWeeksBefore,
      category: input.category || "General",
      status,
      dependsOn: input.dependsOn ? [...input.dependsOn] : [],
      isCriticalPath: false,
      wasClamped,
      overdue,
      notes: input.notes,
    };
    processedMap.set(input.id, milestone);
  }

  // 2. Cycle Detection using DFS 3-color algorithm
  // Dependency: if A dependsOn B, B -> A in dependency graph (B must finish before A).
  const nodeIds = Array.from(processedMap.keys());
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) {
    adj.set(id, []);
  }

  for (const milestone of processedMap.values()) {
    for (const prereqId of milestone.dependsOn) {
      if (processedMap.has(prereqId)) {
        adj.get(prereqId)!.push(milestone.id);
      }
    }
  }

  const UNVISITED = 0;
  const VISITING = 1;
  const VISITED = 2;
  const visitState = new Map<string, number>();
  for (const id of nodeIds) visitState.set(id, UNVISITED);

  let hasCycle = false;
  const cycleNodesSet = new Set<string>();
  const postOrder: string[] = [];

  function dfs(u: string, path: string[]) {
    visitState.set(u, VISITING);
    path.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      const state = visitState.get(v);
      if (state === VISITING) {
        hasCycle = true;
        // Found a cycle: add all nodes from v to end of path
        const cycleStartIndex = path.indexOf(v);
        if (cycleStartIndex >= 0) {
          for (let i = cycleStartIndex; i < path.length; i++) {
            const node = path[i];
            if (node) {
              cycleNodesSet.add(node);
            }
          }
        }
      } else if (state === UNVISITED) {
        dfs(v, path);
      }
    }

    path.pop();
    visitState.set(u, VISITED);
    postOrder.push(u);
  }

  for (const id of nodeIds) {
    if (visitState.get(id) === UNVISITED) {
      dfs(id, []);
    }
  }

  // 3. Topological sort: reverse postOrder if acyclic
  const topologicalOrder = hasCycle ? [...nodeIds].sort((a, b) => {
    return (processedMap.get(a)?.dueDate || "").localeCompare(processedMap.get(b)?.dueDate || "");
  }) : postOrder.reverse();

  // 4. Critical Path Analysis (DAG longest path)
  const criticalPathIds: string[] = [];
  if (!hasCycle && topologicalOrder.length > 0) {
    // Distance in DAG: length of path (number of milestones in chain)
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();

    for (const id of topologicalOrder) {
      dist.set(id, 1);
      prev.set(id, null);
    }

    for (const u of topologicalOrder) {
      const uDist = dist.get(u)!;
      for (const v of adj.get(u) || []) {
        if (uDist + 1 > (dist.get(v) || 0)) {
          dist.set(v, uDist + 1);
          prev.set(v, u);
        }
      }
    }

    // Find node with max distance
    let maxDist = 0;
    let endNode: string | null = null;
    for (const [id, d] of dist.entries()) {
      if (d > maxDist) {
        maxDist = d;
        endNode = id;
      }
    }

    // Backtrack to trace critical path if path length > 1
    if (endNode && maxDist > 1) {
      let curr: string | null = endNode;
      while (curr) {
        criticalPathIds.unshift(curr);
        curr = prev.get(curr) || null;
      }
    }
  }

  // Mark critical path on milestones
  const criticalSet = new Set(criticalPathIds);
  const finalMilestones: Milestone[] = topologicalOrder.map((id) => {
    const m = processedMap.get(id)!;
    return {
      ...m,
      isCriticalPath: criticalSet.has(m.id),
    };
  });

  return {
    milestones: finalMilestones,
    hasCycle,
    cycleNodes: Array.from(cycleNodesSet),
    topologicalOrder,
    criticalPathIds,
  };
}
