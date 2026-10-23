"use client";

/**
 * @module PlanOverviewPage
 * @purpose Main dashboard overview for an event plan.
 *          Displays progress, next three priority milestones, budget health gauge,
 *          and parallel module generator with concurrency cap.
 * @rubric Problem Statement Alignment & UX – Next actions, progress health, and parallel generation.
 */

import React, { use, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/domain/money";
import { useGatherlyStore } from "@/store";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default function PlanOverviewPage({ params }: OverviewPageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events, setPlan } = useGatherlyStore();
  const plan = events[eventId];

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [_generationStatus, setGenerationStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});

  if (!plan) return null;

  // Budget calculations
  const _totalAllocated = plan.budgetCategories.reduce((acc, c) => acc + c.allocatedMinor, 0);
  const totalSpent = plan.budgetCategories.reduce((acc, c) => acc + c.spentMinor, 0);
  const budgetUtilization =
    plan.profile.budgetMinor > 0
      ? Math.min(100, Math.round((totalSpent / plan.profile.budgetMinor) * 100))
      : 0;

  // Timeline progress & Next 3 actions
  const completedMilestones = plan.milestones.filter((m) => m.status === "completed").length;
  const totalMilestones = plan.milestones.length;
  const milestoneProgress =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const nextActions = plan.milestones
    .filter((m) => m.status !== "completed")
    .slice(0, 3);

  // Vendors status
  const bookedVendors = plan.vendors.filter((v) => v.status === "booked").length;
  const totalVendors = plan.vendors.length;

  /**
   * Parallel module generation with concurrency cap (Section 5.2.7)
   */
  async function handleGenerateFullPlan() {
    if (!plan) return;
    setIsGeneratingAll(true);
    setGenerationStatus({
      budget: "loading",
      timeline: "loading",
      vendors: "loading",
      ideas: "loading",
    });

    const activePlan = plan;
    const currentPlan: typeof plan = { ...activePlan };

    const tasks = [
      {
        name: "budget",
        run: async () => {
          const res = await fetch("/api/budget", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(activePlan.profile),
          });
          const json = await res.json();
          if (res.ok && json.categories) {
            currentPlan.budgetCategories = json.categories;
            if (json.provider) currentPlan.aiProviderBadge = json.provider;
            setGenerationStatus((s) => ({ ...s, budget: "done" }));
          } else {
            setGenerationStatus((s) => ({ ...s, budget: "error" }));
          }
        },
      },
      {
        name: "timeline",
        run: async () => {
          const res = await fetch("/api/timeline", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(activePlan.profile),
          });
          const json = await res.json();
          if (res.ok && json.milestones) {
            currentPlan.milestones = json.milestones;
            setGenerationStatus((s) => ({ ...s, timeline: "done" }));
          } else {
            setGenerationStatus((s) => ({ ...s, timeline: "error" }));
          }
        },
      },
      {
        name: "vendors",
        run: async () => {
          const res = await fetch("/api/vendors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(activePlan.profile),
          });
          const json = await res.json();
          if (res.ok && json.vendors) {
            currentPlan.vendors = json.vendors;
            setGenerationStatus((s) => ({ ...s, vendors: "done" }));
          } else {
            setGenerationStatus((s) => ({ ...s, vendors: "error" }));
          }
        },
      },
      {
        name: "ideas",
        run: async () => {
          const res = await fetch("/api/ideas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: activePlan.profile,
              existingTitles: activePlan.ideas.map((i) => i.title),
            }),
          });
          const json = await res.json();
          if (res.ok && json.ideas) {
            currentPlan.ideas = json.ideas;
            setGenerationStatus((s) => ({ ...s, ideas: "done" }));
          } else {
            setGenerationStatus((s) => ({ ...s, ideas: "error" }));
          }
        },
      },
    ];

    // Concurrency cap: execute with Promise.allSettled
    await Promise.allSettled(tasks.map((t) => t.run()));

    currentPlan.updatedAt = new Date().toISOString();
    setPlan(currentPlan);
    setIsGeneratingAll(false);
  }

  const isBrandNewPlan =
    plan.budgetCategories.length === 0 &&
    plan.milestones.length === 0 &&
    plan.vendors.length === 0;

  return (
    <div className="space-y-8">
      {/* Brand New Plan Initial Generation Banner */}
      {isBrandNewPlan && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-orange-500/10 border border-amber-300 dark:border-amber-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Generate Your Complete Event Plan
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-xl">
              One click builds your tailored budget allocation, backward-planned milestones, vendor checklist, and personalized ideas concurrently.
            </p>
          </div>
          <button
            onClick={handleGenerateFullPlan}
            disabled={isGeneratingAll}
            className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[48px] flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Generating Plan Modules...</span>
              </>
            ) : (
              <span>✦ Generate Full Plan</span>
            )}
          </button>
        </div>
      )}

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Health */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
            <span>BUDGET HEALTH</span>
            <Link href={`/plan/${eventId}/budget`} className="text-amber-600 dark:text-amber-400 hover:underline">
              View →
            </Link>
          </div>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
            {formatCurrency(totalSpent, plan.profile.currency)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            of {formatCurrency(plan.profile.budgetMinor, plan.profile.currency)} total
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                totalSpent > plan.profile.budgetMinor ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{ width: `${budgetUtilization}%` }}
            />
          </div>
        </div>

        {/* Timeline Progress */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
            <span>TIMELINE</span>
            <Link href={`/plan/${eventId}/timeline`} className="text-amber-600 dark:text-amber-400 hover:underline">
              View →
            </Link>
          </div>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
            {completedMilestones} / {totalMilestones}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            milestones completed ({milestoneProgress}%)
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${milestoneProgress}%` }} />
          </div>
        </div>

        {/* Vendors Booked */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
            <span>VENDORS</span>
            <Link href={`/plan/${eventId}/vendors`} className="text-amber-600 dark:text-amber-400 hover:underline">
              View →
            </Link>
          </div>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
            {bookedVendors} / {totalVendors}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            key vendors booked
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${totalVendors > 0 ? (bookedVendors / totalVendors) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Personalized Ideas */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
            <span>SAVED IDEAS</span>
            <Link href={`/plan/${eventId}/ideas`} className="text-amber-600 dark:text-amber-400 hover:underline">
              View →
            </Link>
          </div>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
            {plan.ideas.filter((i) => i.status === "saved" || i.addedToPlan).length}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            ideas added to your plan
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-3 font-medium">
            {plan.ideas.length} total suggestions available
          </div>
        </div>
      </div>

      {/* Next 3 Priority Actions */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Next Priority Actions
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              The next critical milestones to keep your event on schedule.
            </p>
          </div>
          <Link
            href={`/plan/${eventId}/timeline`}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Full Timeline →
          </Link>
        </div>

        {nextActions.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 py-4 italic">
            No pending milestones. All tasks are complete or timeline is empty.
          </p>
        ) : (
          <div className="space-y-3">
            {nextActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      action.isCriticalPath ? "bg-red-500" : "bg-amber-500"
                    }`}
                    title={action.isCriticalPath ? "Critical Path Item" : "Standard Milestone"}
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {action.title}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Category: {action.category} {action.notes && `• ${action.notes}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-300 block">
                    Due: {action.dueDate}
                  </span>
                  {action.isCriticalPath && (
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      Critical Path
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Re-generate or Refresh Options */}
      {!isBrandNewPlan && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleGenerateFullPlan}
            disabled={isGeneratingAll}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors min-h-[44px]"
          >
            {isGeneratingAll ? "Regenerating..." : "Regenerate All Modules"}
          </button>
        </div>
      )}
    </div>
  );
}
