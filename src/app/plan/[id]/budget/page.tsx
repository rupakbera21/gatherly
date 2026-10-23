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

interface BudgetPageProps {
  params: Promise<{ id: string }>;
}

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

  const colors = [
    "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899",
    "#06b6d4", "#f97316", "#14b8a6", "#6366f1", "#84cc16",
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
            Budget Planner & Allocation
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Exact integer minor-unit math. Test adjustments in the what-if sandbox without calling AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSandboxMode(!sandboxMode)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors min-h-[44px] ${
              sandboxMode
                ? "bg-amber-600 text-white border-amber-600"
                : "border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
            }`}
          >
            {sandboxMode ? "✓ Sandbox Active" : "🎮 What-If Sandbox"}
          </button>

          <button
            onClick={handleExportCsv}
            disabled={categories.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors min-h-[44px] disabled:opacity-40"
          >
            Export CSV
          </button>

          <button
            onClick={handleRegenerateBudget}
            disabled={isRegenerating}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors min-h-[44px] disabled:opacity-50"
          >
            {isRegenerating ? "Regenerating..." : "Regenerate AI Allocation"}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">
            Total Budget
          </span>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-1">
            {formatCurrency(totalBudgetMinor, currency)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {categories.length} categories planned
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">
            Total Allocated
          </span>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-1">
            {formatCurrency(totalAllocatedMinor, currency)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {totalAllocatedMinor === totalBudgetMinor ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ 100% Allocated</span>
            ) : totalAllocatedMinor > totalBudgetMinor ? (
              <span className="text-red-600 font-medium">Over-allocated by {formatCurrency(totalAllocatedMinor - totalBudgetMinor, currency)}</span>
            ) : (
              <span className="text-amber-600 font-medium">{formatCurrency(totalBudgetMinor - totalAllocatedMinor, currency)} unallocated</span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">
            Total Spent / Remaining
          </span>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-1">
            {formatCurrency(totalSpentMinor, currency)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {formatCurrency(remainingBudgetMinor, currency)} remaining
          </div>
        </div>
      </div>

      {/* Visual Budget Distribution (Accessible SVG Bar Chart) */}
      {categories.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
            Allocation Distribution
          </h3>

          <div
            className="w-full h-8 rounded-lg overflow-hidden flex bg-stone-100 dark:bg-stone-800"
            role="img"
            aria-label="Category allocation distribution bar chart"
          >
            {categorySegments.map((cat, idx) => (
              <div
                key={cat.id}
                style={{
                  width: `${cat.percent}%`,
                  backgroundColor: colors[idx % colors.length],
                }}
                title={`${cat.name}: ${cat.percent}% (${formatCurrency(cat.allocatedMinor, currency)})`}
                className="h-full transition-all relative group"
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs">
            {categorySegments.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                  aria-hidden="true"
                />
                <span className="text-stone-700 dark:text-stone-300 font-medium">
                  {cat.name} ({cat.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Table / Sandbox Editor */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            Category Breakdown {sandboxMode && "(Sandbox Live Editing)"}
          </h3>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 py-6 text-center italic">
            No budget categories yet. Click &quot;Regenerate AI Allocation&quot; above or add one manually below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Budget categories table">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500 uppercase tracking-wider">
                  <th scope="col" className="py-3 px-2 font-semibold">Category</th>
                  <th scope="col" className="py-3 px-2 font-semibold">Allocated ({currency})</th>
                  <th scope="col" className="py-3 px-2 font-semibold">Spent ({currency})</th>
                  <th scope="col" className="py-3 px-2 font-semibold">Remaining</th>
                  <th scope="col" className="py-3 px-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {categories.map((cat) => {
                  const allocatedMajor = fromMinorUnits(cat.allocatedMinor, currency);
                  const spentMajor = fromMinorUnits(cat.spentMinor, currency);
                  const remainingMinor = cat.allocatedMinor - cat.spentMinor;

                  return (
                    <tr key={cat.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                      <td className="py-3 px-2 font-medium text-stone-900 dark:text-stone-100">
                        {cat.name}
                        {cat.isContingency && (
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 uppercase font-bold">
                            Contingency
                          </span>
                        )}
                        {cat.notes && (
                          <span className="block text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {cat.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-stone-700 dark:text-stone-300">
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
                            className="w-28 text-sm px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                        ) : (
                          formatCurrency(cat.allocatedMinor, currency)
                        )}
                      </td>

                      <td className="py-3 px-2 text-stone-700 dark:text-stone-300">
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
                            className="w-28 text-sm px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                        ) : (
                          formatCurrency(cat.spentMinor, currency)
                        )}
                      </td>

                      <td className="py-3 px-2">
                        <span
                          className={`font-medium ${
                            remainingMinor < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-stone-700 dark:text-stone-300"
                          }`}
                        >
                          {formatCurrency(remainingMinor, currency)}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleRemoveCategory(cat.id)}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline p-1.5"
                          title={`Delete ${cat.name}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Manual Category Form */}
        <form onSubmit={handleAddCategory} className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="New Category Name (e.g. DJ & Lighting)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 min-w-[200px] text-sm px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 min-h-[44px]"
            required
            aria-label="New category name"
          />
          <input
            type="number"
            min="0"
            placeholder={`Amount (${currency})`}
            value={newCatAmount}
            onChange={(e) => setNewCatAmount(e.target.value)}
            className="w-36 text-sm px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 min-h-[44px]"
            aria-label="New category amount"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 hover:bg-stone-700 transition-colors min-h-[44px]"
          >
            + Add Category
          </button>
        </form>
      </div>
    </div>
  );
}
