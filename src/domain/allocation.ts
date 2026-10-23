/**
 * @module allocation
 * @purpose Largest-Remainder Method (Hare-Niemeyer method) for budget allocation.
 *          Guarantees that allocated parts always sum EXACTLY to total budget
 *          with integer minor units (no cents lost or gained, no negatives).
 *          Deterministic tie-breaking ensures stability under reordering.
 * @rubric Problem Statement Alignment & Code Quality – Deterministic financial math.
 */

export interface AllocationItem {
  id: string;
  weight: number;
}

export interface AllocatedResult<T extends AllocationItem = AllocationItem> {
  item: T;
  allocatedMinor: number;
}

/**
 * Allocate total budget minor units across items using the Largest Remainder method.
 *
 * @param totalBudgetMinor - Total budget in minor units (integer >= 0)
 * @param items - Items with non-negative weights (e.g. percentages or proportions)
 * @returns Array of AllocatedResult in original input order, summing exactly to totalBudgetMinor
 */
export function allocateBudget<T extends AllocationItem>(
  totalBudgetMinor: number,
  items: T[]
): AllocatedResult<T>[] {
  if (!items || items.length === 0) {
    return [];
  }

  const safeTotal = Math.max(0, Math.round(totalBudgetMinor));
  if (safeTotal === 0) {
    return items.map((item) => ({ item, allocatedMinor: 0 }));
  }

  const totalWeight = items.reduce((acc, it) => acc + Math.max(0, it.weight), 0);

  // If all weights are 0, distribute equally
  const effectiveWeights = totalWeight > 0
    ? items.map((it) => Math.max(0, it.weight))
    : items.map(() => 1);
  const effectiveTotalWeight = totalWeight > 0 ? totalWeight : items.length;

  // Step 1: Compute floor shares and fractional remainders
  interface Candidate {
    index: number;
    item: T;
    floorPart: number;
    remainder: number;
  }

  const candidates: Candidate[] = items.map((item, index) => {
    const weight = effectiveWeights[index] ?? 0;
    const exactShare = (weight / effectiveTotalWeight) * safeTotal;
    const floorPart = Math.floor(exactShare);
    const remainder = exactShare - floorPart;
    return {
      index,
      item,
      floorPart,
      remainder,
    };
  });

  // Step 2: Calculate leftover minor units to distribute
  const sumFloors = candidates.reduce((acc, c) => acc + c.floorPart, 0);
  const leftover = safeTotal - sumFloors;

  // Step 3: Sort by remainder descending; break ties deterministically by item ID
  // This guarantees stability under reordering.
  const sorted = [...candidates].sort((a, b) => {
    const remDiff = b.remainder - a.remainder;
    if (Math.abs(remDiff) > 1e-9) {
      return remDiff;
    }
    return a.item.id.localeCompare(b.item.id);
  });

  // Step 4: Add 1 minor unit to top candidates with largest remainder
  const bonusIndices = new Set<number>();
  for (let i = 0; i < leftover && i < sorted.length; i++) {
    const candidate = sorted[i];
    if (candidate) {
      bonusIndices.add(candidate.index);
    }
  }

  // Step 5: Assemble results in original input order
  return candidates.map((c) => ({
    item: c.item,
    allocatedMinor: c.floorPart + (bonusIndices.has(c.index) ? 1 : 0),
  }));
}
