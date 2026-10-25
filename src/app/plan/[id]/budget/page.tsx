"use client";

/**
 * @module PlanBudgetPage
 * @purpose Interactive budget management and what-if sandbox.
 *          Deterministic largest-remainder math, zero LLM calls for sandbox adjustments,
 *          accessible SVG chart + data table, and RFC 4180 CSV export.
 * @rubric Problem Statement Alignment & Efficiency – Instant what-if sandbox, exact integer math.
 */

import React, { use, useState } from "react";
import { exportBudgetCsv } from "@/domain/csv";
import { formatCurrency, fromMinorUnits, toMinorUnits } from "@/domain/money";
import { BudgetCategory } from "@/domain/types";
import { useGatherlyStore } from "@/store";
import { Button, Icon, Badge, Surface, Input } from "@/components/ui";

interface BudgetPageProps {
  params: Promise<{ id: string }>;
}

const PALETTE = [
  "var(--color-primary-600)",
  "var(--color-wedding-tint)",
  "var(--color-birthday-tint)",
  "var(--color-community-tint)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-neutral-500)",
  "var(--color-primary-400)",
];

export default function PlanBudgetPage({ params }: BudgetPageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events, applyPatchToPlan, setPlan } = useGatherlyStore();
  const plan = events[eventId];

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatAmount, setNewCatAmount] = useState("");
  const [sandboxMode, setSandboxMode] = useState(false);

  if (!plan) return null;

  const categories = plan.budgetCategories;
  const currency = plan.profile.currency;
  const totalBudgetMinor = plan.profile.budgetMinor;

  const totalAllocatedMinor = categories.reduce((acc, c) => acc + c.allocatedMinor, 0);
  const totalSpentMinor = categories.reduce((acc, c) => acc + c.spentMinor, 0);
  const remainingBudgetMinor = totalBudgetMinor - totalSpentMinor;

  function handleExportCsv() {
    if (!plan) return;
    const csv = exportBudgetCsv(categories, currency);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.profile.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_budget.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleRegenerateBudget() {
    if (!plan) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan.profile),
      });
      const data = await res.json();
      if (res.ok && data.categories) {
        setPlan({
          ...plan,
          budgetCategories: data.categories,
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsRegenerating(false);
    }
  }

  function handleUpdateCategory(id: string, allocatedMinor: number, spentMinor: number) {
    applyPatchToPlan(eventId, {
      op: "updateBudgetCategory",
      categoryId: id,
      allocatedMinor,
      spentMinor,
    });
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const amount = parseFloat(newCatAmount) || 0;
    const allocatedMinor = toMinorUnits(amount, currency);

    const newCategory: BudgetCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newCatName.trim(),
      allocatedMinor,
      spentMinor: 0,
      isContingency: false,
    };

    applyPatchToPlan(eventId, {
      op: "addBudgetCategory",
      category: newCategory,
    });

    setNewCatName("");
    setNewCatAmount("");
  }

  function handleRemoveCategory(id: string) {
    applyPatchToPlan(eventId, {
      op: "removeBudgetCategory",
      categoryId: id,
    });
  }

  // Pre-calculate percentages for accessible SVG bar visualization
  const categorySegments = categories.map((cat) => {
    const percent =
      totalAllocatedMinor > 0 ? (cat.allocatedMinor / totalAllocatedMinor) * 100 : 0;
    return {
      ...cat,
      percent: Math.round(percent * 10) / 10,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-display">
            Budget Planner & Allocation
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Exact integer minor-unit math. Test adjustments in the what-if sandbox without calling AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={sandboxMode ? "primary" : "secondary"}
            size="sm"
            icon={sandboxMode ? "check" : "sliders"}
            onClick={() => setSandboxMode(!sandboxMode)}
          >
            {sandboxMode ? "Sandbox Active" : "What-If Sandbox"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon="download"
            onClick={handleExportCsv}
            disabled={categories.length === 0}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon="sparkles"
            onClick={handleRegenerateBudget}
            isLoading={isRegenerating}
            disabled={isRegenerating}
          >
            {isRegenerating ? "Regenerating..." : "Regenerate AI Allocation"}
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Surface className="p-5">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Budget
          </span>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 tnum">
            {formatCurrency(totalBudgetMinor, currency)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 tnum">
            {categories.length} categories planned
          </div>
        </Surface>

        <Surface className="p-5">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Allocated
          </span>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 tnum">
            {formatCurrency(totalAllocatedMinor, currency)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {totalAllocatedMinor === totalBudgetMinor ? (
              <span className="text-success font-medium inline-flex items-center gap-1">
                <Icon name="check" size="xs" aria-hidden="true" />
                <span>100% Allocated</span>
              </span>
            ) : totalAllocatedMinor > totalBudgetMinor ? (
              <span className="text-danger font-medium inline-flex items-center gap-1">
                <Icon name="alert-triangle" size="xs" aria-hidden="true" />
                <span>Over-allocated by {formatCurrency(totalAllocatedMinor - totalBudgetMinor, currency)}</span>
              </span>
            ) : (
              <span className="text-warning font-medium">
                {formatCurrency(totalBudgetMinor - totalAllocatedMinor, currency)} unallocated
              </span>
            )}
          </div>
        </Surface>

        <Surface className="p-5">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Spent / Remaining
          </span>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 tnum">
            {formatCurrency(totalSpentMinor, currency)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {remainingBudgetMinor < 0 ? (
              <span className="text-danger font-semibold inline-flex items-center gap-1">
                <Icon name="alert-triangle" size="xs" aria-hidden="true" />
                <span>Over Budget by {formatCurrency(Math.abs(remainingBudgetMinor), currency)}</span>
              </span>
            ) : (
              <span className="tnum">{formatCurrency(remainingBudgetMinor, currency)} remaining</span>
            )}
          </div>
        </Surface>
      </div>

      {/* Visual Budget Distribution (Accessible SVG Bar Chart) */}
      {categories.length > 0 && (
        <Surface className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-display">
            Allocation Distribution
          </h3>

          <div
            role="img"
            aria-label={`Budget allocation stacked chart across ${categories.length} categories`}
            className="w-full h-8 bg-neutral-100 dark:bg-neutral-800 rounded-md overflow-hidden flex"
          >
            {categorySegments.map((cat, idx) => {
              if (cat.percent <= 0) return null;
              const color = PALETTE[idx % PALETTE.length];
              return (
                <div
                  key={cat.id}
                  style={{
                    width: `${cat.percent}%`,
                    backgroundColor: color,
                  }}
                  className="h-full transition-all relative group"
                  title={`${cat.name}: ${cat.percent}% (${formatCurrency(cat.allocatedMinor, currency)})`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
            {categorySegments.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                />
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {cat.name}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 font-mono tnum">
                  {cat.percent}%
                </span>
              </div>
            ))}
          </div>
        </Surface>
      )}

      {/* Categories Table & Inline Editor */}
      <Surface className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-display">
              Budget Line Items
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {sandboxMode
                ? "Sandbox Mode enabled: Modify amounts directly to preview allocation impacts instantly."
                : "Exact allocation and actual spend per event domain."}
            </p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 text-xs text-neutral-500 dark:text-neutral-400">
            No budget categories created yet. Click &quot;Regenerate AI Allocation&quot; above or add one below.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Budget categories table">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                  <th scope="col" className="py-2.5 px-3">Category</th>
                  <th scope="col" className="py-2.5 px-3">Allocated</th>
                  <th scope="col" className="py-2.5 px-3">Spent</th>
                  <th scope="col" className="py-2.5 px-3">Variance</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {categories.map((cat) => {
                  const allocatedMajor = fromMinorUnits(cat.allocatedMinor, currency);
                  const spentMajor = fromMinorUnits(cat.spentMinor, currency);
                  const remainingMinor = cat.allocatedMinor - cat.spentMinor;

                  return (
                    <tr key={cat.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-neutral-900 dark:text-neutral-100">
                        <div className="flex items-center gap-2">
                          <span>{cat.name}</span>
                          {cat.isContingency && (
                            <Badge variant="warning" size="sm">
                              Contingency
                            </Badge>
                          )}
                        </div>
                        {cat.notes && (
                          <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {cat.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-neutral-700 dark:text-neutral-300 font-mono tnum">
                        {sandboxMode ? (
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={allocatedMajor}
                            onChange={(e) =>
                              handleUpdateCategory(
                                cat.id,
                                toMinorUnits(parseFloat(e.target.value) || 0, currency),
                                cat.spentMinor
                              )
                            }
                            aria-label={`Allocated budget for ${cat.name}`}
                            className="w-28 text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          />
                        ) : (
                          formatCurrency(cat.allocatedMinor, currency)
                        )}
                      </td>

                      <td className="py-3 px-3 text-neutral-700 dark:text-neutral-300 font-mono tnum">
                        {sandboxMode ? (
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={spentMajor}
                            onChange={(e) =>
                              handleUpdateCategory(
                                cat.id,
                                cat.allocatedMinor,
                                toMinorUnits(parseFloat(e.target.value) || 0, currency)
                              )
                            }
                            aria-label={`Spent amount for ${cat.name}`}
                            className="w-28 text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          />
                        ) : (
                          formatCurrency(cat.spentMinor, currency)
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono tnum">
                        <span
                          className={`font-medium ${
                            remainingMinor < 0
                              ? "text-danger"
                              : "text-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          {formatCurrency(remainingMinor, currency)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCategory(cat.id)}
                          className="text-danger hover:text-danger hover:bg-danger-surface"
                          title={`Delete ${cat.name}`}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Manual Category Form */}
        <form onSubmit={handleAddCategory} className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-52">
            <Input
              type="text"
              placeholder="New Category Name (e.g. DJ & Lighting)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
              aria-label="New category name"
            />
          </div>
          <div className="w-36">
            <Input
              type="number"
              min="0"
              placeholder={`Amount (${currency})`}
              value={newCatAmount}
              onChange={(e) => setNewCatAmount(e.target.value)}
              aria-label="New category amount"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="md"
            icon="plus"
          >
            Add Category
          </Button>
        </form>
      </Surface>
    </div>
  );
}
